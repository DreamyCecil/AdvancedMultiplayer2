#pragma once

#include "WeaponBase.h"
#include "WeaponPos.h"
#include "WeaponModel.h"
#include "WeaponAnimSet.h"

// List of indices
typedef CStaticArray<INDEX> CIndexList;

// Weapon properties
class CWeaponStruct : public CWeaponBase {
  public:
    SWeaponPos wpsPos; // Weapon position

    // Viewmodel
    CWeaponModel wmMain1; // Main model
    CWeaponModel wmMain2; // Second model
    CWeaponModel wmAlt1;  // Alt fire main model
    CWeaponModel wmAlt2;  // Alt fire second model

    // Viewmodel for dual wielding
    CWeaponModel wmDualMain1; // Main model
    CWeaponModel wmDualMain2; // Second model
    CWeaponModel wmDualAlt1;  // Alt fire main model
    CWeaponModel wmDualAlt2;  // Alt fire second model

    // Item for the player model
    CWeaponModel wmItemMain; // Main model
    CWeaponModel wmItemAlt;  // Alt fire model

    // Animation sets
    SWeaponAnimSet ansMain;     // Main animations
    SWeaponAnimSet ansAlt;      // Animations for alt fire
    SWeaponAnimSet ansDualMain; // Main animations while dual wielding
    SWeaponAnimSet ansDualAlt;  // Animations for alt fire while dual wielding
    SWeaponAnimSet ansItem;     // Player body animations

    CAmmoStruct *pasAmmo; // Ammo
    CAmmoStruct *pasAlt; // Alt ammo
    INDEX iMaxMag; // Magazine size

    CIndexList aiBits; // Special bits of the weapon (for compatibility with PlayerMarker)
    UBYTE ubGroup;     // Weapon group (0 - 31)
    BOOL bDualWeapon;  // Can be selected as an extra weapon

    CIndexList aiWeaponPriority; // Weapons to switch to if needed (if no more ammo etc.)

    enum EDecWeaponAmmo {
      DWA_AMMO = 0, // Main ammo
      DWA_ALT  = 1, // Alt ammo
      DWA_MAG  = 2, // Magazine ammo
    };

    INDEX aiDecAmmo[3]; // Amount of ammo to decrease in some category

    INDEX iPickup; // Ammo in a weapon pickup
    INDEX iPickupAlt; // Alt ammo in a weapon pickup

    FLOAT fDamage;      // Weapon damage
    FLOAT fDamageDM;    // Weapon damage in deathmatch
    FLOAT fDamageAlt;   // Weapon alt damage
    FLOAT fDamageAltDM; // Weapon alt damage in deathmatch

    CTString strMessage; // Computer message about the weapon

    // Constructors
    CWeaponStruct(void);
    CWeaponStruct(CAmmoStruct *pSetAmmo, CAmmoStruct *pSetAlt, CTString strSetIcon, CTString strSetPickup);

    // Get main weapon bit
    INDEX GetBit(void);

    // Check if the bit matches available ones
    BOOL BitMatches(const INDEX &iBit);

    // Write and read weapon properties
    void Write(CTStream *strm);
    void Read(CTStream *strm);
};

// Weapon structures and icons
extern CDynamicContainer<CWeaponStruct> _apWeaponStructs;
extern CWeaponIcons _aWeaponIcons;
