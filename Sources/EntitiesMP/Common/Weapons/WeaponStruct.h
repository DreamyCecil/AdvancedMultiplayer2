#pragma once

#include "DreamyJSON/DreamyStructures/DataStructures.h"

// Default positions
#define DEF_WPOS FLOAT3D(0.0f, 0.0f, 0.0f)
#define DEF_WROT ANGLE3D(0.0f, 0.0f, 0.0f)
#define DEF_PLACE CPlacement3D(DEF_WPOS, DEF_WROT)
#define DEF_FOV 90.0f

// Icon list
typedef CDList<CTextureObject *> CWeaponIcons;

// Base structure
struct SWeaponBase {
  ULONG ulID; // unique ID
  CTString strIcon; // HUD icon path
  CTextureObject *ptoIcon; // pointer to the icon

  FLOAT fMana; // pickup mana
  CTString strPickup; // pickup name

  // Constructor
  SWeaponBase(ULONG ulSetID, CTString strSetIcon, FLOAT fSetMana, CTString strSetPickup) :
    ulID(ulSetID), strIcon(strSetIcon), fMana(fSetMana), strPickup(strSetPickup), ptoIcon(NULL) {};

  // Comparison
  BOOL operator==(const SWeaponBase &wbOther) {
    return (this->ulID == wbOther.ulID);
  };

  // Set the icon
  void AddIcon(CTString strSetIcon, CWeaponIcons &aIcons);
};

// Weapon ammo
struct SWeaponAmmo : public SWeaponBase {
  INDEX iAmount; // maximum ammo amount

  // Constructors
  SWeaponAmmo(void) : SWeaponBase(0, "", 0.0f, ""), iAmount(0) {};

  SWeaponAmmo(CTString strSetIcon, INDEX iSetAmmo, FLOAT fSetMana, CTString strSetPickup) :
    SWeaponBase(0, strSetIcon, fSetMana, strSetPickup), iAmount(iSetAmmo) {};

  // Write and read
  void Write(CTStream *strm);
  void Read(CTStream *strm);

  // Set max ammo
  void SetAmmo(INDEX iSet);
};

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

// Weapon properties
struct SWeaponStruct : public SWeaponBase {
  SWeaponPos wpsPos; // weapon position

  SWeaponAmmo *pAmmo; // ammo
  SWeaponAmmo *pAlt; // alt ammo

  INDEX iPickup; // ammo in a weapon pickup
  INDEX iPickupAlt; // alt ammo in a weapon pickup

  // Constructors
  SWeaponStruct(void) : SWeaponBase(0, "", 0.0f, ""), wpsPos(DEF_PLACE, DEF_PLACE, DEF_WPOS, DEF_FOV),
                        pAmmo(NULL), pAlt(NULL), iPickup(0), iPickupAlt(0) {};

  SWeaponStruct(CPlacement3D plSetFirst, CPlacement3D plSetThird, FLOAT3D vSetFire, FLOAT fSetFOV,
                SWeaponAmmo *pSetAmmo, SWeaponAmmo *pSetAlt, CTString strSetIcon,
                INDEX iSetPickup, INDEX iSetPickupAlt, FLOAT fSetMana, CTString strSetPickup) :
    SWeaponBase(0, strSetIcon, fSetMana, strSetPickup), wpsPos(plSetFirst, plSetThird, vSetFire, fSetFOV),
    pAmmo(pSetAmmo), pAlt(pSetAlt), iPickup(iSetPickup), iPickupAlt(iSetPickupAlt) {};

  // Write and read
  void Write(CTStream *strm);
  void Read(CTStream *strm);
};

// Weapon ammo and properties for the world
extern CDList<SWeaponAmmo> _aWeaponAmmo;
extern CDList<SWeaponStruct> _aPlayerWeapons;
extern CWeaponIcons _aAmmoIcons;
extern CWeaponIcons _aWeaponIcons;
