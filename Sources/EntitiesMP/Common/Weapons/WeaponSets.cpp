#include "StdH.h"

#include "WeaponStruct.h"

// Config parser
#include "EntitiesMP/Common/ConfigFunc.h"

// Current weapon set
extern CTString _strCurrentWeaponSet;

// Ammo pointer
#define AP(_Ammo) (_Ammo >= 0 && _Ammo < _apAmmoStructs.Count() ? _apAmmoStructs.Pointer(_Ammo) : NULL)

// Add new weapon to the list
static void AddWeapon(CWeaponStruct *pws) {
  // Set weapon ID from position
  pws->ulID = _apWeaponStructs.Count();

  _apWeaponStructs.Add(pws);

  // Create the icon
  pws->AddIcon(pws->strIcon, _aWeaponIcons);
};

// Set weapon models from certain keys
static void SetWeaponModels(CConfigBlock &cbModelType, CTString strSet, string *astrKeys, CStaticArray<CWeaponModel *> &awmModels) {
  CTString strModelConfig;

  // Go through models of a certain type
  for (INDEX iModel = 0; iModel < awmModels.Count(); iModel++)
  {
    // Get model config path
    if (!GetConfigString(cbModelType, astrKeys[iModel], strModelConfig)) {
      // No key or path string, doesn't matter
      continue;
    }

    // Absolute path
    if (!FileExists(strModelConfig)) {
      // Relative to the weapon set
      strModelConfig = strSet + strModelConfig;

      if (!FileExists(strModelConfig)) {
        // No model config
        continue;
      }
    }

    // Set model from the config
    CWeaponModel &wm = *awmModels[iModel];

    if (!wm.SetWeaponModel(strModelConfig)) {
      // Couldn't set the model
      ThrowF_t("Couldn't set model \"%s\"!", astrKeys[iModel].c_str());
    }
  }
};

// Parse weapon config
static void ParseWeaponConfig(CWeaponStruct *pws, CTString strSet, CTString strConfig) {
  // Parse the config
  CConfigBlock cb;
  
  try {
    LoadJSON(strConfig, cb);

  } catch (char *) {
    return;
  }

  // Included configs
  {
    DJSON_Block &mapBlock = cb;

    // Go through each entry
    for (INDEX iValue = 0; iValue < mapBlock.size(); iValue++)
    {
      string strName = mapBlock.GetKey(iValue);
      CConfigValue &cv = mapBlock.GetValue(iValue);

      // Parse files with extras
      if (strName == "Include" && cv.cv_eType == CVT_STRING) {
        ParseWeaponConfig(pws, strSet, strSet + cv.cv_strValue);
      }
    }
  }

  INDEX i = 0;
  FLOAT f = 0.0f;

  // Weapon positions
  {
    if (GetConfigPlacement(cb, "Pos1", pws->wpsPos.plPos)) {
      // Copy first person position in case the dual weapon position doesn't exist
      pws->wpsPos.plPos2 = pws->wpsPos.plPos;
    }
  
    GetConfigPlacement(cb, "Pos2", pws->wpsPos.plPos2);
    GetConfigPlacement(cb, "Pos3", pws->wpsPos.plThird);

    // Fire position
    GetConfigVector(cb, "PosFire", pws->wpsPos.vFire);

    // Whichever type
    if (GetConfigInt(cb, "FOV", i)) pws->wpsPos.fFOV = i;
    else if (GetConfigFloat(cb, "FOV", f)) pws->wpsPos.fFOV = f;
  }
  
  // Ammo
  {
    // Types
    if (GetConfigInt(cb, "Ammo", i))       pws->pasAmmo = AP(i);
    if (GetConfigInt(cb, "AltAmmo", i))    pws->pasAlt = AP(i);
    if (GetConfigInt(cb, "Mag", i))        pws->iMaxMag = ceil(i * AmmoMul());
    if (GetConfigInt(cb, "PickupAmmo", i)) pws->iPickup = ceil(i * AmmoMul());
    if (GetConfigInt(cb, "PickupAlt", i))  pws->iPickupAlt = ceil(i * AmmoMul());

    // Decreasing ammo
    GetConfigInt(cb, "DecAmmo", pws->aiDecAmmo[CWeaponStruct::DWA_AMMO]);
    GetConfigInt(cb, "DecAlt", pws->aiDecAmmo[CWeaponStruct::DWA_ALT]);
    GetConfigInt(cb, "DecMag", pws->aiDecAmmo[CWeaponStruct::DWA_MAG]);
  }

  // Damage (whichever type)
  {
    if (GetConfigInt(cb, "Damage", i)) pws->fDamage = i;
    else if (GetConfigFloat(cb, "Damage", f)) pws->fDamage = f;

    if (GetConfigInt(cb, "DamageDM", i)) pws->fDamageDM = i;
    else if (GetConfigFloat(cb, "DamageDM", f)) pws->fDamageDM = f;

    if (GetConfigInt(cb, "DamageAlt", i)) pws->fDamageAlt = i;
    else if (GetConfigFloat(cb, "DamageAlt", f)) pws->fDamageAlt = f;

    if (GetConfigInt(cb, "DamageAltDM", i)) pws->fDamageAltDM = i;
    else if (GetConfigFloat(cb, "DamageAltDM", f)) pws->fDamageAltDM = f;
  }

  // Other
  {
    if (GetConfigString(cb, "Name", pws->strPickup)) {
      // Translate immediately
      pws->strPickup = Translate(pws->strPickup.str_String, 0);
    }

    GetConfigString(cb, "Icon", pws->strIcon);
    GetConfigString(cb, "Message", pws->strMessage);
  
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
  }

  // Models
  CConfigBlock cbModels;

  if (cb.GetValue("Models", cbModels)) {
    // First person view models
    static const string astrTypes[2] = {
      "View", "ViewDual",
    };

    CWeaponModel *apWeaponModels[2] = {
      &pws->wmMain1, &pws->wmDualMain1,
    };

    CPlacement3D *aOffsets[2] = {
      &pws->wpsPos.plPos, &pws->wpsPos.plPos2,
    };

    for (INDEX iType = 0; iType < 2; iType++) {
      CConfigBlock cbViewModel;
      
      // Get model type
      if (!cbModels.GetValue(astrTypes[iType], cbViewModel)) {
        // No key, doesn't matter
        continue;
      }

      // Different models
      static string astrTypeModels[4] = {
        "Main1", "Main2", "Alt1", "Alt2",
      };

      // Different structures
      CStaticArray<CWeaponModel *> awmModels;
      awmModels.New(4);

      for (INDEX iWeaponModel = 0; iWeaponModel < 4; iWeaponModel++) {
        awmModels[iWeaponModel] = apWeaponModels[iType] + iWeaponModel;
      }

      SetWeaponModels(cbViewModel, strSet, astrTypeModels, awmModels);

      // Get weapon offset
      GetConfigPlacement(cbViewModel, "Offset", *aOffsets[iType]);
    }

    // Third person view models
    {
      CConfigBlock cbItemModel;

      // Get model type
      if (cbModels.GetValue("Item", cbItemModel)) {
        // Different models
        static string astrTypeModels[2] = {
          "Main", "Alt",
        };

        // Different structures
        CStaticArray<CWeaponModel *> awmModels;
        awmModels.New(2);

        awmModels[0] = &pws->wmItemMain;
        awmModels[1] = &pws->wmItemAlt;

        SetWeaponModels(cbItemModel, strSet, astrTypeModels, awmModels);

        // Get weapon offset
        GetConfigPlacement(cbItemModel, "Offset", pws->wpsPos.plThird);
      }
    }
  }
};

// Load all weapons from a set
extern void LoadWeaponSet(void) {
  // Load default sets
  CDynamicStackArray<CTFileName> aList;
  
  // Add empty weapon
  AddWeapon(new CWeaponStruct(NULL, NULL, "", ""));
  
  // Go through weapon configs
  CTString strWeaponSet = "Configs\\WeaponSets\\" + _strCurrentWeaponSet + "\\";
  MakeDirList(aList, CTFileName(strWeaponSet), "*.json", 0);

  for (INDEX iWeapon = 0; iWeapon < aList.Count(); iWeapon++) {
    CTString strFile = aList[iWeapon].str_String;

    CWeaponStruct *pwsStruct = new CWeaponStruct();

    // Assign group automatically in case it's not present
    pwsStruct->ubGroup = (_apWeaponStructs.Count() % 31) + 1;

    // Parse the config
    try {
      ParseWeaponConfig(pwsStruct, strWeaponSet, strFile);

    } catch (char *strError) {
      FatalError("Couldn't load the weapon from \"%s\":\n%s", strFile, strError);
    }

    // Add the weapon
    AddWeapon(pwsStruct);
  }
};
