#pragma once

#include "Depends/DreamyJSON/DreamyStructures/DataStructures.h"

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
