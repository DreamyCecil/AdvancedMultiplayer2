#include "StdH.h"

#include "WeaponBase.h"

// Config parser
#include "EntitiesMP/Common/ConfigFunc.h"

// Set icon
void CWeaponBase::AddIcon(CTString strSetIcon, CWeaponIcons &aIcons) {
  // Empty icon
  if (strSetIcon == "") {
    ptoIcon = NULL;
    aIcons.Add(NULL);
    return;
  }

  // Already added
  if (ptoIcon != NULL) {
    return;
  }

  // Add new icon
  try {
    ptoIcon = new CTextureObject;

    ptoIcon->SetData_t(CTFileName(strSetIcon));
    ((CTextureData*)ptoIcon->GetData())->Force(TEX_CONSTANT);

    aIcons.Add(ptoIcon);

  } catch (char *strError) {
    FatalError(strError);
  }
};

// World functions

// Ammo pointer
#define AP(_Ammo) (_Ammo >= 0 && _Ammo < _apWeaponAmmo.Count() ? _apWeaponAmmo.Pointer(_Ammo) : NULL)

// Add new ammo to the list
static void AddAmmo(CWeaponAmmo *pwa) {
  // Set ammo ID from position
  pwa->ulID = _apWeaponAmmo.Count();

  _apWeaponAmmo.Add(pwa);

  // Create the icon
  pwa->AddIcon(pwa->strIcon, _aWeaponIcons);
};

// Add new weapon to the list
static void AddWeapon(CWeaponStruct *pws) {
  // Set weapon ID from position
  pws->ulID = _apPlayerWeapons.Count();

  _apPlayerWeapons.Add(pws);

  // Create the icon
  pws->AddIcon(pws->strIcon, _aWeaponIcons);
};

// Parse ammo config
static BOOL ParseAmmoConfig(CWeaponAmmo *pwa, CTString strSet, CTString strConfig) {
  // Parse the config
  CConfigBlock cb;

  try {
    LoadJSON(strConfig, cb);

  } catch (char *) {
    return FALSE;
  }
  
  // Included config
  if (GetConfigString(cb, "Include", strConfig)) {
    ParseAmmoConfig(pwa, strSet, strConfig);
  }

  // Ammo properties
  GetConfigString(cb, "Name", pwa->strPickup);
  GetConfigString(cb, "Icon", pwa->strIcon);

  GetConfigInt(cb, "Display", (INDEX &)pwa->bDisplay);

  // Pickup values
  INDEX i = 0;
  FLOAT f = 0.0f;

  if (GetConfigInt(cb, "Ammo", i)) {
    pwa->SetAmmo(i);
  }

  // Whichever type
  if (GetConfigInt(cb, "Mana", i)) pwa->fMana = i;
  else if (GetConfigFloat(cb, "Mana", f)) pwa->fMana = f;

  return TRUE;
};

// Parse weapon config
static BOOL ParseWeaponConfig(CWeaponStruct *pws, CTString strSet, CTString strConfig) {
  // Parse the config
  CConfigBlock cb;
  
  try {
    LoadJSON(strConfig, cb);

  } catch (char *) {
    return FALSE;
  }

  // Included config
  CTString strInclude;

  if (GetConfigString(cb, "Include", strInclude)) {
    ParseWeaponConfig(pws, strSet, strSet + strInclude);
  }

  INDEX i = 0;
  FLOAT f = 0.0f;

  // Get weapon positions
  if (GetConfigPlacement(cb, "Pos1", pws->wpsPos.plPos)) {
    // Copy first person position in case the dual weapon position doesn't exist
    pws->wpsPos.plPos2 = pws->wpsPos.plPos;
  }
  
  GetConfigPlacement(cb, "Pos2", pws->wpsPos.plPos2);
  GetConfigPlacement(cb, "Pos3", pws->wpsPos.plThird);

  GetConfigVector(cb, "PosFire", pws->wpsPos.vFire);

  // Whichever type
  if (GetConfigInt(cb, "FOV", i)) pws->wpsPos.fFOV = i;
  else if (GetConfigFloat(cb, "FOV", f)) pws->wpsPos.fFOV = f;
  
  // Ammo types
  if (GetConfigInt(cb, "Ammo", i)) {
    pws->pwaAmmo = AP(i);
  }

  if (GetConfigInt(cb, "AltAmmo", i)) {
    pws->pwaAlt = AP(i);
  }

  if (GetConfigInt(cb, "Mag", i)) {
    pws->iMaxMag = ceil(i * AmmoMul());
  }

  if (GetConfigInt(cb, "PickupAmmo", i)) {
    pws->iPickup = ceil(i * AmmoMul());
  }

  if (GetConfigInt(cb, "PickupAlt", i)) {
    pws->iPickupAlt = ceil(i * AmmoMul());
  }

  // Decreasing ammo
  GetConfigInt(cb, "DecAmmo", pws->aiDecAmmo[CWeaponStruct::DWA_AMMO]);
  GetConfigInt(cb, "DecAlt", pws->aiDecAmmo[CWeaponStruct::DWA_ALT]);
  GetConfigInt(cb, "DecMag", pws->aiDecAmmo[CWeaponStruct::DWA_MAG]);

  // Damage (whichever type)
  if (GetConfigInt(cb, "Damage", i)) pws->fDamage = i;
  else if (GetConfigFloat(cb, "Damage", f)) pws->fDamage = f;

  if (GetConfigInt(cb, "DamageDM", i)) pws->fDamageDM = i;
  else if (GetConfigFloat(cb, "DamageDM", f)) pws->fDamageDM = f;

  if (GetConfigInt(cb, "DamageAlt", i)) pws->fDamageAlt = i;
  else if (GetConfigFloat(cb, "DamageAlt", f)) pws->fDamageAlt = f;

  if (GetConfigInt(cb, "DamageAltDM", i)) pws->fDamageAltDM = i;
  else if (GetConfigFloat(cb, "DamageAltDM", f)) pws->fDamageAltDM = f;

  // Other
  GetConfigString(cb, "Name", pws->strPickup);
  GetConfigString(cb, "Icon", pws->strIcon);
  
  // Whichever type
  if (GetConfigInt(cb, "Mana", i)) pws->fMana = i;
  else if (GetConfigFloat(cb, "Mana", f)) pws->fMana = f;

  DJSON_Array aBits;
  
  // single bit
  if (GetConfigInt(cb, "Bit", i)) {
    // no bits
    if (i < 0) {
      pws->aiBits.Clear();

    } else {
      pws->aiBits.New(1);
      pws->aiBits[0] = i;
    }

  // multiple bits
  } else if (cb.GetValue("Bit", aBits)) {
    INDEX ctBits = aBits.Count();
    pws->aiBits.New(ctBits);

    for (INDEX iCopy = 0; iCopy < ctBits; iCopy++) {
      pws->aiBits[iCopy] = aBits[iCopy].GetNumber();
    }
  }

  if (GetConfigInt(cb, "Group", i)) {
    pws->ubGroup = Clamp((UBYTE)i, (UBYTE)0, (UBYTE)31);
  }

  GetConfigInt(cb, "Dual", (INDEX &)pws->bDualWeapon);

  // weapon priority list
  DJSON_Array aPriority;

  if (cb.GetValue("Priority", aPriority)) {
    INDEX ctPriorities = aPriority.Count();
    pws->aiWeaponPriority.New(ctPriorities);

    for (INDEX iCopy = 0; iCopy < ctPriorities; iCopy++) {
      pws->aiWeaponPriority[iCopy] = aPriority[iCopy].GetNumber();
    }
  }

  // models
  #define WEAPON_MODELS 3
  CTString strModelConfig;

  // weapon models
  CWeaponModel *apModels = &pws->wmModel1;

  // model types in the config
  CTString strType[WEAPON_MODELS] = {
    "Model1",
    "Model2",
    "Model3",
  };

  for (INDEX iModel = 0; iModel < WEAPON_MODELS; iModel++) {
    // get model config path
    if (!GetConfigString(cb, strType[iModel].str_String, strModelConfig)) {
      // no key or path string, doesn't matter
      continue;
    }

    // weapon set path
    strModelConfig = strSet + strModelConfig;

    // skip if no config
    if (!FileExists(strModelConfig)) {
      continue;
    }

    // set model from the config
    if (!apModels[iModel].SetWeaponModel(strModelConfig)) {
      // couldn't set the model
      FatalError("Couldn't set model \"%s\" for the weapon in \"%s\"!", strType[iModel], strConfig);
      return FALSE;
    }
  }

  return TRUE;
};

// Check if weapons have been loaded
static BOOL _bWeaponsLoaded = FALSE;
extern CTString _strCurrentWeaponSet = "";

// Load weapons and ammo for this world
extern void LoadWorldWeapons(CWorld *pwo) {
  // already loaded
  if (_bWeaponsLoaded) {
    return;
  }

  // select weapon set
  _strCurrentWeaponSet = "Default";

  // load default sets
  CDynamicStackArray<CTFileName> aList;

  // go through ammo configs
  CTString strAmmoSet = "Configs\\AmmoSets\\" + _strCurrentWeaponSet + "\\";
  MakeDirList(aList, CTFileName(strAmmoSet), "*.json", 0);

  for (INDEX iAmmo = 0; iAmmo < aList.Count(); iAmmo++) {
    CTString strFile = aList[iAmmo].str_String;

    // parse the config
    CWeaponAmmo *pwaAmmo = new CWeaponAmmo();
    ParseAmmoConfig(pwaAmmo, strAmmoSet, strFile);

    // add the ammo
    AddAmmo(pwaAmmo);
  }
  
  // add empty weapon
  AddWeapon(new CWeaponStruct(NULL, NULL, "", ""));
  
  // go through weapon configs
  CTString strWeaponSet = "Configs\\WeaponSets\\" + _strCurrentWeaponSet + "\\";
  MakeDirList(aList, CTFileName(strWeaponSet), "*.json", 0);

  for (INDEX iWeapon = 0; iWeapon < aList.Count(); iWeapon++) {
    CTString strFile = aList[iWeapon].str_String;

    CWeaponStruct *pwsStruct = new CWeaponStruct();

    // assign group automatically in case it's not present
    pwsStruct->ubGroup = (_apPlayerWeapons.Count() % 31) + 1;

    // parse the config
    ParseWeaponConfig(pwsStruct, strWeaponSet, strFile);

    // add the weapon
    AddWeapon(pwsStruct);
  }
  
  // weapons have been loaded
  _bWeaponsLoaded = TRUE;
};

// Weapons and ammo cleanup
void ClearWorldWeapons(void) {
  // delete structures
  {FOREACHINDYNAMICCONTAINER(_apWeaponAmmo, CWeaponAmmo, itwa) {
    delete &*itwa;
  }}
  _apWeaponAmmo.Clear();
  
  {FOREACHINDYNAMICCONTAINER(_apPlayerWeapons, CWeaponStruct, itws) {
    delete &*itws;
  }}
  _apPlayerWeapons.Clear();

  // delete icons
  {FOREACHINDYNAMICCONTAINER(_aAmmoIcons, CTextureObject, itto) {
    CTextureObject *pto = itto;

    if (pto != NULL) {
      delete pto;
    }
  }}
  _aAmmoIcons.Clear();
  
  {FOREACHINDYNAMICCONTAINER(_aWeaponIcons, CTextureObject, itto) {
    CTextureObject *pto = itto;

    if (pto != NULL) {
      delete pto;
    }
  }}
  _aWeaponIcons.Clear();

  // mark as unloaded
  _bWeaponsLoaded = FALSE;
};
