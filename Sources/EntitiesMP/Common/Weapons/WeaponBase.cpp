#include "StdH.h"

#include "WeaponBase.h"

// Config parser
#include "EntitiesMP/Common/ConfigFunc.h"

// Set icon
void CWeaponBase::AddIcon(CTString strSetIcon, CWeaponIcons &aIcons) {
  // empty icon
  if (strSetIcon == "") {
    ptoIcon = NULL;
    aIcons.Add(NULL);
    return;
  }

  // already added
  if (ptoIcon != NULL) {
    return;
  }

  // add new icon
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
#define AP(_Ammo) (_Ammo < _apWeaponAmmo.Count() ? _apWeaponAmmo[_Ammo] : NULL)

// Add new ammo to the list
static void AddAmmo(CWeaponAmmo *pwa) {
  int iAmmo = _apWeaponAmmo.Add(pwa);

  // set ID of the added ammo
  pwa->ulID = iAmmo;

  // create the icon
  pwa->AddIcon(pwa->strIcon, _aWeaponIcons);
};

// Add new weapon to the list
static void AddWeapon(CWeaponStruct *pws) {
  int iWeapon = _apPlayerWeapons.Add(pws);

  // set ID of the added weapon
  pws->ulID = iWeapon;

  // create the icon
  pws->AddIcon(pws->strIcon, _aWeaponIcons);
};

// Parse ammo config
static BOOL ParseAmmoConfig(CWeaponAmmo *pwa, CTString strSet, CTString strConfig) {
  // parse the config
  CConfigBlock cb;
  if (ParseConfig(strConfig, cb) != DJSON_OK) {
    return FALSE;
  }
  
  // included config
  if (GetConfigString(cb, "Include", strConfig)) {
    ParseAmmoConfig(pwa, strSet, strConfig);
  }

  // ammo properties
  GetConfigString(cb, "Name", pwa->strPickup);
  GetConfigString(cb, "Icon", pwa->strIcon);

  int iDisplay = 1;
  if (cb.GetValue("Display", iDisplay)) {
    pwa->bDisplay = iDisplay;
  }

  // pickup values
  int iAmmo = 0;
  CConfigValue valMana;

  if (cb.GetValue("Ammo", iAmmo)) {
    pwa->SetAmmo(iAmmo);
  }
  if (cb.GetValue("Mana", valMana)) {
    pwa->fMana = valMana.GetNumber();
  }

  return TRUE;
};

// Parse weapon config
static BOOL ParseWeaponConfig(CWeaponStruct *pws, CTString strSet, CTString strConfig) {
  // parse the config
  CConfigBlock cb;
  if (ParseConfig(strConfig, cb) != DJSON_OK) {
    return FALSE;
  }

  // included config
  CTString strInclude;

  if (GetConfigString(cb, "Include", strInclude)) {
    ParseWeaponConfig(pws, strSet, strSet + strInclude);
  }

  CConfigValue val;

  // get weapon positions
  if (cb.FindKeyIndex("Pos1") != -1) {
    GetConfigPlacement(cb, "Pos1", pws->wpsPos.plPos);
  
    // copy first person position in case the dual weapon position doesn't exist
    pws->wpsPos.plPos2 = pws->wpsPos.plPos;
  }
  
  GetConfigPlacement(cb, "Pos2", pws->wpsPos.plPos2);
  GetConfigPlacement(cb, "Pos3", pws->wpsPos.plThird);

  GetConfigVector(cb, "PosFire", pws->wpsPos.vFire);

  if (cb.GetValue("FOV", val)) {
    pws->wpsPos.fFOV = val.GetNumber();
  }

  // ammo
  int iAmmo = -1;
  int iAlt = -1;
  int iMag = 0;
  int iPickupAmmo = -1;
  int iPickupAlt = -1;
  
  // ammo types
  if (cb.GetValue("Ammo", iAmmo)) {
    pws->pwaAmmo = (iAmmo != -1 ? AP(iAmmo) : NULL);
  }

  if (cb.GetValue("AltAmmo", iAlt)) {
    pws->pwaAlt = (iAlt != -1 ? AP(iAlt) : NULL);
  }

  if (cb.GetValue("Mag", iMag)) {
    pws->iMaxMag = ceil(iMag * AmmoMul());
  }

  if (cb.GetValue("PickupAmmo", iPickupAmmo)) {
    pws->iPickup = ceil(iPickupAmmo * AmmoMul());
  }

  if (cb.GetValue("PickupAlt", iPickupAlt)) {
    pws->iPickupAlt = ceil(iPickupAlt * AmmoMul());
  }

  // decreasing ammo
  if (cb.GetValue("DecAmmo", iAmmo)) {
    pws->aiDecAmmo[CWeaponStruct::DWA_AMMO] = iAmmo;
  }

  if (cb.GetValue("DecAlt", iAlt)) {
    pws->aiDecAmmo[CWeaponStruct::DWA_ALT] = iAlt;
  }

  if (cb.GetValue("DecMag", iMag)) {
    pws->aiDecAmmo[CWeaponStruct::DWA_MAG] = iMag;
  }

  // damage
  if (cb.GetValue("Damage", val)) {
    pws->fDamage = val.GetNumber();
  }

  if (cb.GetValue("DamageDM", val)) {
    pws->fDamageDM = val.GetNumber();
  }

  if (cb.GetValue("DamageAlt", val)) {
    pws->fDamageAlt = val.GetNumber();
  }

  if (cb.GetValue("DamageAltDM", val)) {
    pws->fDamageAltDM = val.GetNumber();
  }

  // other
  GetConfigString(cb, "Name", pws->strPickup);
  GetConfigString(cb, "Icon", pws->strIcon);

  if (cb.GetValue("Mana", val)) {
    pws->fMana = val.GetNumber();
  }

  int iBit = -1;
  DJSON_Array aBits;
  
  // single bit
  if (cb.GetValue("Bit", iBit)) {
    // no bits
    if (iBit < 0) {
      pws->aiBits.Clear();

    } else {
      pws->aiBits.New(1);
      pws->aiBits[0] = iBit;
    }

  // multiple bits
  } else if (cb.GetValue("Bit", aBits)) {
    INDEX ctBits = aBits.Count();
    pws->aiBits.New(ctBits);

    for (INDEX iCopy = 0; iCopy < ctBits; iCopy++) {
      pws->aiBits[iCopy] = aBits[iCopy].GetNumber();
    }
  }

  int iGroup = 0;
  int iDual = 0;

  if (cb.GetValue("Group", iGroup)) {
    pws->ubGroup = Clamp(iGroup, (int)0, (int)31);
  }

  if (cb.GetValue("Dual", iDual)) {
    pws->bDualWeapon = iDual;
  }

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
  HookConfigFunctions();

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
  INDEX iStruct;

  for (iStruct = 0; iStruct < _apWeaponAmmo.Count(); iStruct++) {
    delete _apWeaponAmmo[iStruct];
  }
  _apWeaponAmmo.Clear();

  for (iStruct = 0; iStruct < _apPlayerWeapons.Count(); iStruct++) {
    delete _apPlayerWeapons[iStruct];
  }
  _apPlayerWeapons.Clear();

  // delete icons
  INDEX iIcon;

  for (iIcon = 0; iIcon < _aAmmoIcons.Count(); iIcon++) {
    delete _aAmmoIcons[iIcon];
    _aAmmoIcons[iIcon] = NULL;
  }
  _aAmmoIcons.Clear();

  for (iIcon = 0; iIcon < _aWeaponIcons.Count(); iIcon++) {
    delete _aWeaponIcons[iIcon];
    _aWeaponIcons[iIcon] = NULL;
  }
  _aWeaponIcons.Clear();

  // mark as unloaded
  _bWeaponsLoaded = FALSE;
};
