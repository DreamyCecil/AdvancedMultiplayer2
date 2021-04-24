#include "StdH.h"
#include "WeaponBase.h"

// Config parser
#include "EntitiesMP/Common/ConfigFunc.h"

// Set icon
void SWeaponBase::AddIcon(CTString strSetIcon, CWeaponIcons &aIcons) {
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
#define AP(_Ammo) (_Ammo < _awaWeaponAmmo.Count() ? &_awaWeaponAmmo[_Ammo] : NULL)

// Add new ammo to the list
static void AddAmmo(SWeaponAmmo &wa) {
  int iAmmo = _awaWeaponAmmo.Add(wa);

  // set ID of the added ammo
  SWeaponAmmo &waAdded = _awaWeaponAmmo[iAmmo];
  waAdded.ulID = iAmmo;

  // create the icon
  waAdded.AddIcon(waAdded.strIcon, _aWeaponIcons);
};

// Add new weapon to the list
static void AddWeapon(SWeaponStruct &wp) {
  int iWeapon = _awsPlayerWeapons.Add(wp);

  // set ID of the added weapon
  SWeaponStruct &wsAdded = _awsPlayerWeapons[iWeapon];
  wsAdded.ulID = iWeapon;

  // create the icon
  wsAdded.AddIcon(wsAdded.strIcon, _aWeaponIcons);
};

// Parse ammo config
static BOOL ParseAmmoConfig(SWeaponAmmo &wa, CTString strSet, CTString strConfig) {
  // parse the config
  CConfigBlock cb;
  if (ParseConfig(strConfig, cb) != DJSON_OK) {
    return FALSE;
  }
  
  // included config
  if (GetConfigString(cb, "Include", strConfig)) {
    ParseAmmoConfig(wa, strSet, strConfig);
  }

  // ammo properties
  GetConfigString(cb, "Name", wa.strPickup);
  GetConfigString(cb, "Icon", wa.strIcon);

  int iDisplay = 1;
  if (cb.GetValue("Display", iDisplay)) {
    wa.bDisplay = iDisplay;
  }

  // pickup values
  int iAmmo = 0;
  CConfigValue valMana;

  if (cb.GetValue("Ammo", iAmmo)) {
    wa.SetAmmo(iAmmo);
  }
  if (cb.GetValue("Mana", valMana)) {
    wa.fMana = valMana.GetNumber();
  }

  return TRUE;
};

// Parse weapon config
static BOOL ParseWeaponConfig(SWeaponStruct &ws, CTString strSet, CTString strConfig) {
  // parse the config
  CConfigBlock cb;
  if (ParseConfig(strConfig, cb) != DJSON_OK) {
    return FALSE;
  }

  // included config
  if (GetConfigString(cb, "Include", strConfig)) {
    ParseWeaponConfig(ws, strSet, strSet + strConfig);
  }

  CConfigValue val;

  // get weapon positions
  GetConfigPlacement(cb, "Pos1", ws.wpsPos.plPos);
  GetConfigPlacement(cb, "Pos3", ws.wpsPos.plThird);

  // copy first person position in case the dual weapon position doesn't exist
  ws.wpsPos.plPos2 = ws.wpsPos.plPos;
  GetConfigPlacement(cb, "Pos2", ws.wpsPos.plPos2);

  GetConfigVector(cb, "PosFire", ws.wpsPos.vFire);

  if (cb.GetValue("FOV", val)) {
    ws.wpsPos.fFOV = val.GetNumber();
  }

  // ammo
  int iAmmo = -1;
  int iAlt = -1;
  int iMag = 0;
  int iPickupAmmo = -1;
  int iPickupAlt = -1;
  
  // ammo types
  if (cb.GetValue("Ammo", iAmmo)) {
    ws.pwaAmmo = (iAmmo != -1 ? AP(iAmmo) : NULL);
  }

  if (cb.GetValue("AltAmmo", iAlt)) {
    ws.pwaAlt = (iAlt != -1 ? AP(iAlt) : NULL);
  }

  if (cb.GetValue("Mag", iMag)) {
    ws.iMaxMag = ceil(iMag * AmmoMul());
  }

  if (cb.GetValue("PickupAmmo", iPickupAmmo)) {
    ws.iPickup = ceil(iPickupAmmo * AmmoMul());
  }

  if (cb.GetValue("PickupAlt", iPickupAlt)) {
    ws.iPickupAlt = ceil(iPickupAlt * AmmoMul());
  }

  // decreasing ammo
  if (cb.GetValue("DecAmmo", iAmmo)) {
    ws.aiDecAmmo[SWeaponStruct::DWA_AMMO] = iAmmo;
  }

  if (cb.GetValue("DecAlt", iAlt)) {
    ws.aiDecAmmo[SWeaponStruct::DWA_ALT] = iAlt;
  }

  if (cb.GetValue("DecMag", iMag)) {
    ws.aiDecAmmo[SWeaponStruct::DWA_MAG] = iMag;
  }

  // damage
  if (cb.GetValue("Damage", val)) {
    ws.fDamage = val.GetNumber();
  }

  if (cb.GetValue("DamageDM", val)) {
    ws.fDamageDM = val.GetNumber();
  }

  if (cb.GetValue("DamageAlt", val)) {
    ws.fDamageAlt = val.GetNumber();
  }

  if (cb.GetValue("DamageAltDM", val)) {
    ws.fDamageAltDM = val.GetNumber();
  }

  // other
  GetConfigString(cb, "Name", ws.strPickup);
  GetConfigString(cb, "Icon", ws.strIcon);

  if (cb.GetValue("Mana", val)) {
    ws.fMana = val.GetNumber();
  }

  int iBit = -1;
  DJSON_Array aBits;
  
  // single bit
  if (cb.GetValue("Bit", iBit)) {
    // no bits
    if (iBit < 0) {
      ws.aiBits.Clear();

    } else {
      ws.aiBits.New(1);
      ws.aiBits[0] = iBit;
    }

  // multiple bits
  } else if (cb.GetValue("Bit", aBits)) {
    INDEX ctBits = aBits.Count();
    ws.aiBits.New(ctBits);

    for (INDEX iCopy = 0; iCopy < ctBits; iCopy++) {
      ws.aiBits[iCopy] = aBits[iCopy].GetNumber();
    }
  }

  int iGroup = 0;
  int iDual = 0;

  if (cb.GetValue("Group", iGroup)) {
    ws.iGroup = iGroup;
  }

  if (cb.GetValue("Dual", iDual)) {
    ws.bDualWeapon = iDual;
  }

  // models
  #define WEAPON_MODELS 3
  CTString strModelConfig;

  // weapon models
  SWeaponModel *apModels = &ws.wmModel1;

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

    // [Cecil] TEMP: Skip if no config
    if (!FileExists(strModelConfig)) {
      continue;
    }

    // set model from the config
    if (apModels[iModel].SetModel(strModelConfig) == WM_MODELERROR) {
      // couldn't set the model
      FatalError("Couldn't set model \"%s\" for the weapon in \"%s\"!", strType[iModel], strConfig);
      return FALSE;
    }
  }

  return TRUE;
};

// Check if weapons have been loaded
static BOOL _bWeaponsLoaded = FALSE;

// Load weapons and ammo for this world
extern void LoadWorldWeapons(CWorld *pwo) {
  // already loaded
  if (_bWeaponsLoaded) {
    return;
  }

  // load default sets
  CDynamicStackArray<CTFileName> aList;
  HookConfigFunctions();

  // go through ammo configs
  CTString strAmmoSet = "Configs\\AmmoSets\\Default\\";
  MakeDirList(aList, CTFileName(strAmmoSet), "*.json", 0);

  for (INDEX iAmmo = 0; iAmmo < aList.Count(); iAmmo++) {
    CTString strFile = aList[iAmmo].str_String;

    // parse the config
    SWeaponAmmo waAmmo;
    ParseAmmoConfig(waAmmo, strAmmoSet, strFile);

    // add the ammo
    AddAmmo(waAmmo);
  }
  
  // add empty weapon
  AddWeapon(SWeaponStruct(NULL, NULL, "", ""));
  
  // go through weapon configs
  CTString strWeaponSet = "Configs\\WeaponSets\\Default\\";
  MakeDirList(aList, CTFileName(strWeaponSet), "*.json", 0);

  for (INDEX iWeapon = 0; iWeapon < aList.Count(); iWeapon++) {
    CTString strFile = aList[iWeapon].str_String;

    SWeaponStruct wsStruct;

    // assign group automatically in case it's not present
    wsStruct.iGroup = (_awsPlayerWeapons.Count() % 31) + 1;

    // parse the config
    ParseWeaponConfig(wsStruct, strWeaponSet, strFile);

    // add the weapon
    AddWeapon(wsStruct);
  }
  
  // weapons have been loaded
  _bWeaponsLoaded = TRUE;
};

// Weapons and ammo cleanup
void ClearWorldWeapons(void) {
  _awaWeaponAmmo.Clear();
  _awsPlayerWeapons.Clear();

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
