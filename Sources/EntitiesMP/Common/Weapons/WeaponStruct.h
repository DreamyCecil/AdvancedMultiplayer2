#pragma once

#include "WeaponBase.h"
#include "WeaponPos.h"
#include "WeaponModel.h"

// List of indices
typedef CStaticArray<INDEX> CIndexList;

// Weapon properties
class CWeaponStruct : public CWeaponBase {
  public:
    SWeaponPos wpsPos; // weapon position

    CWeaponModel wmModel1; // First person model
    CWeaponModel wmModel2; // First person model (other hand)
    CWeaponModel wmModel3; // Third person model

    CWeaponAmmo *pwaAmmo; // Ammo
    CWeaponAmmo *pwaAlt; // Alt ammo
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
    CWeaponStruct(CWeaponAmmo *pSetAmmo, CWeaponAmmo *pSetAlt, CTString strSetIcon, CTString strSetPickup);

    // Get main weapon bit
    INDEX GetBit(void);

    // Check if the bit matches available ones
    BOOL BitMatches(const INDEX &iBit);

    // Write and read weapon properties
    void Write(CTStream *strm);
    void Read(CTStream *strm);
};

// Weapon structures and icons
extern CDynamicContainer<CWeaponStruct> _apPlayerWeapons;
extern CWeaponIcons _aWeaponIcons;
