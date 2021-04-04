#pragma once

// Weapon position
struct SWeaponPos {
  CPlacement3D plPos; // first person position
  CPlacement3D plThird; // third person position
  FLOAT3D vFire; // attack offset
  FLOAT fFOV; // first person FOV

  // Constructor
  SWeaponPos(CPlacement3D plSetFirst, CPlacement3D plSetThird, FLOAT3D vSetFire, FLOAT fSetFOV) :
    plPos(plSetFirst), plThird(plSetThird), vFire(vSetFire), fFOV(fSetFOV) {};

  // Get position
  inline FLOAT3D &Pos1(void) { return plPos.pl_PositionVector; };
  inline FLOAT3D &Pos3(void) { return plThird.pl_PositionVector; };
  
  // Get specific position
  inline FLOAT &Pos1(const INDEX &iPos) { return plPos.pl_PositionVector(iPos); };
  inline FLOAT &Pos3(const INDEX &iPos) { return plThird.pl_PositionVector(iPos); };

  // Get rotation
  inline ANGLE3D &Rot1(void) { return plPos.pl_OrientationAngle; };
  inline ANGLE3D &Rot3(void) { return plThird.pl_OrientationAngle; };
  
  // Get specific rotation
  inline FLOAT &Rot1(const INDEX &iPos) { return plPos.pl_OrientationAngle(iPos); };
  inline FLOAT &Rot3(const INDEX &iPos) { return plThird.pl_OrientationAngle(iPos); };
};
