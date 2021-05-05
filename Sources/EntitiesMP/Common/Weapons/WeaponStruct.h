#pragma once

#include "WeaponBase.h"
#include "WeaponPos.h"
#include "WeaponModel.h"

// List of indices
typedef CDArray<INDEX> CIndexList;

// Weapon properties
class CWeaponStruct : public CWeaponBase {
  public:
    SWeaponPos wpsPos; // weapon position

    CWeaponModel wmModel1; // first person model
    CWeaponModel wmModel2; // first person model (other hand)
    CWeaponModel wmModel3; // third person model

    CWeaponAmmo *pwaAmmo; // ammo
    CWeaponAmmo *pwaAlt; // alt ammo
    INDEX iMaxMag; // magazine size

    CIndexList aiBits; // special bits of the weapon (for compatibility with PlayerMarker)
    UBYTE ubGroup;      // weapon group (0 - 31)
    BOOL bDualWeapon;  // can be selected as an extra weapon

    CIndexList aiWeaponPriority; // weapons to switch to if needed (if no more ammo etc.)

    enum EDecWeaponAmmo {
      DWA_AMMO = 0, // main ammo
      DWA_ALT  = 1, // alt ammo
      DWA_MAG  = 2, // magazine ammo
    };

    INDEX aiDecAmmo[3]; // amount of ammo to decrease in some category

    INDEX iPickup; // ammo in a weapon pickup
    INDEX iPickupAlt; // alt ammo in a weapon pickup

    FLOAT fDamage;   // weapon damage
    FLOAT fDamageDM; // weapon damage in deathmatch
    FLOAT fDamageAlt;   // weapon alt damage
    FLOAT fDamageAltDM; // weapon alt damage in deathmatch

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
extern CDList<CWeaponStruct *> _apPlayerWeapons;
extern CWeaponIcons _aWeaponIcons;
