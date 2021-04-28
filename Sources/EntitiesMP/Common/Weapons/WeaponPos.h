#pragma once

// Position offset for player's body attachments
#define COLT_LEFT_POS  FLOAT3D(0.00f, -0.02f, -0.2f)
#define COLT_RIGHT_POS FLOAT3D(0.03f, -0.01f, -0.2f)

// Rotation offset for player's body attachments
#define COLT_LEFT_ROT  ANGLE3D(0.0f, 5.0f, 0.0f)
#define COLT_RIGHT_ROT ANGLE3D(0.0f, 5.0f, 0.0f)

// Weapon position
struct SWeaponPos {
  CPlacement3D plPos;   // first person position
  CPlacement3D plPos2;  // first person position for dual weapons
  CPlacement3D plThird; // third person position

  FLOAT3D vFire; // attack offset
  FLOAT fFOV; // first person FOV

  // Constructor
  SWeaponPos(CPlacement3D plSetFirst, CPlacement3D plSetDual, CPlacement3D plSetThird, FLOAT3D vSetFire, FLOAT fSetFOV) :
    plPos(plSetFirst), plPos2(plSetDual), plThird(plSetThird), vFire(vSetFire), fFOV(fSetFOV) {};

  // Get position
  inline FLOAT3D &Pos1(void) { return plPos.pl_PositionVector; };
  inline FLOAT3D &Pos2(void) { return plPos2.pl_PositionVector; };
  inline FLOAT3D &Pos3(void) { return plThird.pl_PositionVector; };
  
  // Get specific position
  inline FLOAT &Pos1(const INDEX &iPos) { return plPos.pl_PositionVector(iPos); };
  inline FLOAT &Pos2(const INDEX &iPos) { return plPos2.pl_PositionVector(iPos); };
  inline FLOAT &Pos3(const INDEX &iPos) { return plThird.pl_PositionVector(iPos); };

  // Get rotation
  inline ANGLE3D &Rot1(void) { return plPos.pl_OrientationAngle; };
  inline ANGLE3D &Rot2(void) { return plPos2.pl_OrientationAngle; };
  inline ANGLE3D &Rot3(void) { return plThird.pl_OrientationAngle; };
  
  // Get specific rotation
  inline FLOAT &Rot1(const INDEX &iPos) { return plPos.pl_OrientationAngle(iPos); };
  inline FLOAT &Rot2(const INDEX &iPos) { return plPos2.pl_OrientationAngle(iPos); };
  inline FLOAT &Rot3(const INDEX &iPos) { return plThird.pl_OrientationAngle(iPos); };
};
