import json
import math

def quat_to_r(q):
    w, x, y, z = q
    return [
        [1 - 2*y*y - 2*z*z, 2*x*y - 2*z*w, 2*x*z + 2*y*w],
        [2*x*y + 2*z*w, 1 - 2*x*x - 2*z*z, 2*y*z - 2*x*w],
        [2*x*z - 2*y*w, 2*y*z + 2*x*w, 1 - 2*x*x - 2*y*y]
    ]

def mat_mul(A, B):
    C = [[0,0,0],[0,0,0],[0,0,0]]
    for i in range(3):
        for j in range(3):
            for k in range(3):
                C[i][j] += A[i][k] * B[k][j]
    return C

def mat_inv(m):
    det = (m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
           m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
           m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]))
    invDet = 1.0 / det
    return [
        [(m[1][1] * m[2][2] - m[1][2] * m[2][1]) * invDet, (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * invDet, (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invDet],
        [(m[1][2] * m[2][0] - m[1][0] * m[2][2]) * invDet, (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invDet, (m[1][0] * m[0][2] - m[0][0] * m[1][2]) * invDet],
        [(m[1][0] * m[2][1] - m[1][1] * m[2][0]) * invDet, (m[2][0] * m[0][1] - m[0][0] * m[2][1]) * invDet, (m[0][0] * m[1][1] - m[1][0] * m[0][1]) * invDet]
    ]

def get_h(data):
    fx, fy, cx, cy = data['camera_params']
    K = [[fx, 0, cx], [0, fy, cy], [0, 0, 1]]
    q = data['model_pose'][:4]
    tx, ty, tz = data['model_pose'][4:]
    R = quat_to_r(q)
    # H = K * [r1, r2, t]
    M = [[R[0][0], R[0][1], tx], [R[1][0], R[1][1], ty], [R[2][0], R[2][1], tz]]
    return mat_mul(K, M)

with open('../../Downloads/cardinals_left_rect_corr.json') as f:
    L = json.load(f)
with open('../../Downloads/cardinals_right_rect_corr.json') as f:
    R = json.load(f)

HL = get_h(L)
HR = get_h(R)
HR_inv = mat_inv(HR)
H_r2l = mat_mul(HL, HR_inv)

# Flatten and normalize
flat = [x for row in H_r2l for x in row]
norm = [x / flat[8] for x in flat]
print(json.dumps(norm))
