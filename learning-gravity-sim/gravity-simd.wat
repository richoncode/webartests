;; 2D N-body gravity kernel, WebAssembly SIMD (v128/f32x4).
;;
;; Layout: JS owns typed-array VIEWS directly over this module's exported
;; memory (no copy in/out per frame) — posX/posY/velX/velY/mass are each a
;; contiguous f32 array of length paddedN (a multiple of 4, so the SIMD inner
;; loop never needs remainder handling; padding entries have mass=0 so they
;; contribute exactly zero force and are simply never targeted by the outer
;; loop, which only runs to actualN).
;;
;; Two-pass update (semi-implicit/symplectic Euler), split into two exported
;; functions so position reads during force accumulation always see the
;; start-of-step state, never a partially-updated one:
;;   stepVelocities: for each real particle i, sum forces from all paddedN
;;     particles j (4 at a time via SIMD), then vel[i] += accel * dt.
;;   stepPositions: pos[i] += vel[i] * dt (also SIMD, 4 particles at a time —
;;     not the hot O(N^2) part, but it's free to vectorize too).
(module
  (memory (export "memory") 64)

  (func $stepVelocities (export "stepVelocities")
    (param $posXPtr i32) (param $posYPtr i32)
    (param $velXPtr i32) (param $velYPtr i32)
    (param $massPtr i32)
    (param $actualN i32) (param $paddedN i32)
    (param $g f32) (param $dt f32) (param $softening f32)
    (local $i i32) (local $j i32)
    (local $ix f32) (local $iy f32)
    (local $accX v128) (local $accY v128)
    (local $softv v128) (local $onev v128)
    (local $dx v128) (local $dy v128)
    (local $distSq v128) (local $dist v128) (local $invDist v128) (local $invDist3 v128)
    (local $massv v128) (local $scale v128)
    (local $sumAx f32) (local $sumAy f32)
    (local $ax f32) (local $ay f32)
    (local $iOff i32) (local $jOff i32)

    (local.set $softv (f32x4.splat (local.get $softening)))
    (local.set $onev (f32x4.splat (f32.const 1.0)))

    (local.set $i (i32.const 0))
    (block $outer_done
      (loop $outer
        (br_if $outer_done (i32.ge_s (local.get $i) (local.get $actualN)))
        (local.set $iOff (i32.mul (local.get $i) (i32.const 4)))

        (local.set $ix (f32.load (i32.add (local.get $posXPtr) (local.get $iOff))))
        (local.set $iy (f32.load (i32.add (local.get $posYPtr) (local.get $iOff))))
        (local.set $accX (f32x4.splat (f32.const 0)))
        (local.set $accY (f32x4.splat (f32.const 0)))

        (local.set $j (i32.const 0))
        (block $inner_done
          (loop $inner
            (br_if $inner_done (i32.ge_s (local.get $j) (local.get $paddedN)))
            (local.set $jOff (i32.mul (local.get $j) (i32.const 4)))

            (local.set $dx
              (f32x4.sub
                (v128.load (i32.add (local.get $posXPtr) (local.get $jOff)))
                (f32x4.splat (local.get $ix))))
            (local.set $dy
              (f32x4.sub
                (v128.load (i32.add (local.get $posYPtr) (local.get $jOff)))
                (f32x4.splat (local.get $iy))))

            (local.set $distSq
              (f32x4.add
                (f32x4.add
                  (f32x4.mul (local.get $dx) (local.get $dx))
                  (f32x4.mul (local.get $dy) (local.get $dy)))
                (local.get $softv)))

            (local.set $dist (f32x4.sqrt (local.get $distSq)))
            (local.set $invDist (f32x4.div (local.get $onev) (local.get $dist)))
            (local.set $invDist3
              (f32x4.mul
                (f32x4.mul (local.get $invDist) (local.get $invDist))
                (local.get $invDist)))

            (local.set $massv (v128.load (i32.add (local.get $massPtr) (local.get $jOff))))
            (local.set $scale (f32x4.mul (local.get $massv) (local.get $invDist3)))

            (local.set $accX (f32x4.add (local.get $accX) (f32x4.mul (local.get $scale) (local.get $dx))))
            (local.set $accY (f32x4.add (local.get $accY) (f32x4.mul (local.get $scale) (local.get $dy))))

            (local.set $j (i32.add (local.get $j) (i32.const 4)))
            (br $inner)
          )
        )

        (local.set $sumAx
          (f32.add
            (f32.add (f32x4.extract_lane 0 (local.get $accX)) (f32x4.extract_lane 1 (local.get $accX)))
            (f32.add (f32x4.extract_lane 2 (local.get $accX)) (f32x4.extract_lane 3 (local.get $accX)))))
        (local.set $sumAy
          (f32.add
            (f32.add (f32x4.extract_lane 0 (local.get $accY)) (f32x4.extract_lane 1 (local.get $accY)))
            (f32.add (f32x4.extract_lane 2 (local.get $accY)) (f32x4.extract_lane 3 (local.get $accY)))))

        (local.set $ax (f32.mul (local.get $g) (local.get $sumAx)))
        (local.set $ay (f32.mul (local.get $g) (local.get $sumAy)))

        (f32.store
          (i32.add (local.get $velXPtr) (local.get $iOff))
          (f32.add
            (f32.load (i32.add (local.get $velXPtr) (local.get $iOff)))
            (f32.mul (local.get $ax) (local.get $dt))))
        (f32.store
          (i32.add (local.get $velYPtr) (local.get $iOff))
          (f32.add
            (f32.load (i32.add (local.get $velYPtr) (local.get $iOff)))
            (f32.mul (local.get $ay) (local.get $dt))))

        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $outer)
      )
    )
  )

  (func $stepPositions (export "stepPositions")
    (param $posXPtr i32) (param $posYPtr i32)
    (param $velXPtr i32) (param $velYPtr i32)
    (param $paddedN i32) (param $dt f32)
    (local $i i32) (local $off i32) (local $dtv v128)
    (local.set $dtv (f32x4.splat (local.get $dt)))
    (local.set $i (i32.const 0))
    (block $done
      (loop $lp
        (br_if $done (i32.ge_s (local.get $i) (local.get $paddedN)))
        (local.set $off (i32.mul (local.get $i) (i32.const 4)))
        (v128.store
          (i32.add (local.get $posXPtr) (local.get $off))
          (f32x4.add
            (v128.load (i32.add (local.get $posXPtr) (local.get $off)))
            (f32x4.mul (v128.load (i32.add (local.get $velXPtr) (local.get $off))) (local.get $dtv))))
        (v128.store
          (i32.add (local.get $posYPtr) (local.get $off))
          (f32x4.add
            (v128.load (i32.add (local.get $posYPtr) (local.get $off)))
            (f32x4.mul (v128.load (i32.add (local.get $velYPtr) (local.get $off))) (local.get $dtv))))
        (local.set $i (i32.add (local.get $i) (i32.const 4)))
        (br $lp)
      )
    )
  )
)
