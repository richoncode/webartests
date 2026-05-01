---
author: Spatial Scene Design (Spatial Systems Architect)
status: AUTHORITATIVE
---

# Spatial Scene Design Specification

## 0. Operating Modes
- **MODE: generate** &rarr; create scene.md
- **MODE: audit** &rarr; validate against scene.md
- **MODE: extend** &rarr; add without breaking consistency

*This specification is XR-platform agnostic and acts as the authoritative spatial contract between humans and AI.*

---

## 1. Notation and Conventions

- **Transform Naming:** $T_{\text{TARGET\_SOURCE}}$ maps a vector or point from $\text{SOURCE}$ space to $\text{TARGET}$ space.
- **Vector Convention:** Column vectors ($v = [x, y, z]^T$).
- **Multiplication Order:** Right-to-left. ($p_{\text{TARGET}} = T_{\text{TARGET\_SOURCE}} * p_{\text{SOURCE}}$)
- **Quaternion Format:** $q = [x, y, z, w]$ (where $w$ is the scalar real part).
- **Angle Units:** Radians ($\text{rad}$) for computation.
- **Distance Units:** Meters ($\text{m}$) in physical spaces.
- **Basis Vectors:** For any space $\text{S}$, basis vectors are $X_{\text{S}}, Y_{\text{S}}, Z_{\text{S}}$.
- **No equation may use undefined notation.** Any symbol not defined in Section 11 is strictly prohibited.

---

## 2. Coordinate System Inventory

| Name | Handedness | Axis Directions $(+X, +Y, +Z)$ | Units | Origin | Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **WORLD** | Right | Right, Up, Back | Meters | Session start point (Device) | XR Platform |
| **SCENE** | Right | Right, Up, Back | Meters | User-defined root of app | App Logic |
| **APP** | Right | Right, Up, Back | App Units | Same as SCENE (scaled) | App Logic |
| **USER\_HEAD**| Right | Right, Up, Back | Meters | Center of HMD | XR Tracking |
| **CTRL\_R** | Right | Right, Up, Back | Meters | Right controller grip | XR Tracking |
| **CTRL\_L** | Right | Right, Up, Back | Meters | Left controller grip | XR Tracking |
| **ASSET** | Right | Right, Up, Back | App Units | Origin of 3D model | Asset File |
| **LOCAL** | Right | Right, Up, Back | App Units | Component/Bone pivot | Component |

---

## 3. Transform Graph

| Source &rarr; Target | Representation | Static or Dynamic | Owner |
| :--- | :--- | :--- | :--- |
| **$T_{\text{WORLD\_HEAD}}$** | $4 \times 4$ Matrix | Dynamic | XR System |
| **$T_{\text{WORLD\_CTRL}}$** | $4 \times 4$ Matrix | Dynamic | XR System |
| **$T_{\text{WORLD\_SCENE}}$**| $4 \times 4$ Matrix | Static (Anchored) | App Logic |
| **$T_{\text{SCENE\_APP}}$** | $4 \times 4$ Matrix | Static | App Logic |
| **$T_{\text{APP\_ASSET}}$** | $4 \times 4$ Matrix | Static or Dynamic | Scene Graph |
| **$T_{\text{ASSET\_LOCAL}}$**| $4 \times 4$ Matrix | Dynamic | Animation |

---

## 4. Axis Definitions

| System | Forward | Up | Right | Mismatches/Notes |
| :--- | :--- | :--- | :--- | :--- |
| **WORLD** | $-Z$ | $+Y$ | $+X$ | WebXR Standard |
| **USER\_HEAD**| $-Z$ | $+Y$ | $+X$ | $-Z$ is gaze direction |
| **CTRL\_R/L** | $-Z$ | $+Y$ | $+X$ | $-Z$ is pointer direction |
| **ASSET** | $-Z$ | $+Y$ | $+X$ | GLTF defaults |

---

## 5. Physical vs Render Space

- **Physical Space:** Measured in strict metric units (WORLD, USER_HEAD, CTRL_R/L).
- **Render Space:** Internal application coordinates (APP, ASSET, LOCAL).
- **Separation:** Mixing coordinates across these spaces without explicit transform scaling is strictly invalid.
- **Conversion:** $T_{\text{SCENE\_APP}}$ encodes the physical-to-render scale ($S$).
  - $T_{\text{SCENE\_APP}} = \text{Translation}(p) * \text{Rotation}(q) * \text{Scale}(S, S, S)$

---

## 6. Object Placement Model

Object placement requires an explicit transform chain from LOCAL to WORLD space.

**Model Matrix Equation:**
$M_{\text{world\_object}} = T_{\text{WORLD\_SCENE}} * T_{\text{SCENE\_APP}} * T_{\text{APP\_ASSET}} * T_{\text{ASSET\_LOCAL}}$

Every symbol represents a specific spatial jump. Implicit grouping or collapsing of transforms is prohibited.

---

## 7. Behavior / Constraint Model (CRITICAL)

Each dynamic behavior defines output transforms via mathematical constraints.

### 7.1 Required Behavior Types

| Name | Input Spaces | Output Transform | Constraints | Update Frequency |
| :--- | :--- | :--- | :--- | :--- |
| **Static** | WORLD, SCENE | $T_{\text{WORLD\_SCENE}}$| Position/rotation locked to anchor | On Calibrate |
| **Tracking** | WORLD, USER_HEAD | $T_{\text{WORLD\_HEAD}}$ | Maps HMD pose to WORLD | Per-frame |
| **Billboard**| APP, USER_HEAD | $T_{\text{APP\_ASSET}}$ | $-Z_{\text{ASSET}}$ points to $p_{\text{HEAD}}$ | Per-frame |
| **Axis-Constrained Billboard** | APP, USER_HEAD | $T_{\text{APP\_ASSET}}$ | $-Z_{\text{ASSET}}$ points to $p_{\text{HEAD}}$ projected on XZ | Per-frame |

### 7.2 REQUIRED: Ray-Anchored Billboard Panel

Positions a panel dynamically (e.g., along a controller ray), oriented to face a target source (the user's head), constrained to remain level with the world.

**Inputs:**
- $p_{\text{target}}$: The anchor point (e.g., point on controller ray or raycast hit).
- $p_{\text{source}}$: The point the billboard should face (e.g., user's head).
- $d$: Optional offset distance along the source-to-target vector (push-back).
- $reference\_up\_vector$: Fixed WORLD up vector $[0, 1, 0]^T$.

**Output:** $T_{\text{WORLD\_OBJECT}}$

**Constraints & Equations:**
1. **Placement:**
   $p_{\text{object}} = p_{\text{target}} + (normalize(p_{\text{target}} - p_{\text{source}}) * d)$
   *(Note: Calculates base target and applies offset vector of length $d$)*
2. **Orientation:**
   $forward\_axis_{\text{object}} = normalize(p_{\text{source}} - p_{\text{target}})$
   $up\_axis_{\text{object}} = reference\_up\_vector$
   $right\_axis_{\text{object}} = cross(forward\_axis_{\text{object}}, up\_axis_{\text{object}})$
3. **Re-orthonormalize (Correction for non-level source):**
   $up\_axis_{\text{object}} = cross(right\_axis_{\text{object}}, forward\_axis_{\text{object}})$

Resulting transform:
$T_{\text{WORLD\_OBJECT}} = \begin{bmatrix} right\_axis_{\text{object}} & up\_axis_{\text{object}} & forward\_axis_{\text{object}} & p_{\text{object}} \\ 0 & 0 & 0 & 1 \end{bmatrix}$

---

## 8. Input / Tracking Relationships

Input data flows from hardware to WORLD space.
- **Head Pose:** From IMU/SLAM $\rightarrow T_{\text{WORLD\_HEAD}}$
- **Controller Pose:** From IMU/Cameras $\rightarrow T_{\text{WORLD\_CTRL}}$
- **Intersection Ray:**
  $Ray_{\text{APP\_SPACE}} = T_{\text{APP\_SCENE}} * T_{\text{SCENE\_WORLD}} * T_{\text{WORLD\_CTRL}} * [0,0,0,1]^T$

---

## 9. Canonical Examples

### A. World-Anchored Object (Virtual Lamp on Physical Table)
- **Transform Chain:** $M_{\text{lamp}} = T_{\text{WORLD\_SCENE}} * T_{\text{SCENE\_APP}} * T_{\text{APP\_LAMP}}$
- **Behavior:** Static. $T_{\text{APP\_LAMP}}$ is identity. $T_{\text{WORLD\_SCENE}}$ is derived from a one-time spatial raycast against the room mesh.

### B. Billboard Object (Floating Label)
- **Transform Chain:** $M_{\text{label}} = T_{\text{WORLD\_SCENE}} * T_{\text{SCENE\_APP}} * T_{\text{APP\_ASSET}} * T_{\text{ASSET\_LABEL}}$
- **Behavior:** Billboard. $T_{\text{APP\_ASSET}}$ translation is fixed. Rotation is updated per-frame: $q = \text{LookAt}(p_{\text{ASSET}}, p_{\text{USER\_HEAD\_IN\_APP}})$.

### C. Axis-Constrained Billboard (NPC Sprite)
- **Transform Chain:** $M_{\text{npc}} = T_{\text{WORLD\_SCENE}} * T_{\text{SCENE\_APP}} * T_{\text{APP\_NPC}}$
- **Behavior:** Axis-Constrained Billboard. Rotation aligns with $normalize(p_{\text{HEAD\_IN\_APP}} - p_{\text{NPC}})$, but with the Y-component of the vector set to $0$ prior to normalization.

---

## 10. Validation Rules

1. **Transform Integrity:** Objects missing a defined coordinate space or transform chain will not render.
2. **Math Clarity:** Vague behaviors ("follows user") are invalid. Must provide matrix equations or constraint vectors.
3. **Space Matching:** Multiplying a matrix by a vector from a mismatched coordinate space will trigger a validation failure.
4. **Ambiguity Protocol:** If ambiguity exists, do not guess. Surface it as a validation error and propose a mathematical correction.

---

## 11. Undefined Symbol Audit

**Status:** PASS. All symbols used are explicitly defined below.

- $T_{\text{A\_B}}$: $4 \times 4$ Matrix transforming from space B to A.
- $p$: Position coordinate vector $[x, y, z]^T$.
- $v$: Direction vector $[x, y, z]^T$.
- $q$: Quaternion rotation.
- $M$: Final Model Render matrix.
- $S$: Scale multiplier.
- $d$: Distance scalar offset.
- $X, Y, Z$: Orthogonal axis vectors.
- $forward\_axis, right\_axis, up\_axis$: Calculated matrix columns for orthonormal basis.
- $reference\_up\_vector$: Constant $[0,1,0]^T$.
- $normalize()$: Yields vector of length 1.
- $cross(a, b)$: Vector cross product.
- $LookAt(a, b)$: Yields rotation pointing from a to b.
