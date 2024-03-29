#include "StdH.h"

#include "AmmoStruct.h"

// Config parser
#include "EntitiesMP/Common/ConfigFunc.h"

// Current weapon set
extern CTString _strCurrentWeaponSet;

// Add new ammo to the list
static void AddAmmo(CAmmoStruct *pas) {
  // Set ammo ID from position
  pas->ulID = _apAmmoStructs.Count();

  _apAmmoStructs.Add(pas);

  // Create the icon
  pas->AddIcon(pas->strIcon, _aWeaponIcons);
};

// Parse ammo config
static void ParseAmmoConfig(CAmmoStruct *pwa, CTString strSet, CTString strConfig) {
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
        ParseAmmoConfig(pwa, strSet, strSet + cv.cv_strValue);
      }
    }
  }

  // Ammo properties
  if (GetConfigString(cb, "Name", pwa->strPickup)) {
    // Translate immediately
    pwa->strPickup = Translate(pwa->strPickup.str_String, 0);
  }

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
};

// Load all ammo from a set
extern void LoadAmmoSet(void) {
  // Load default sets
  CDynamicStackArray<CTFileName> aList;

  // Go through ammo configs
  CTString strAmmoSet = "Configs\\AmmoSets\\" + _strCurrentWeaponSet + "\\";
  MakeDirList(aList, CTFileName(strAmmoSet), "*.json", 0);

  for (INDEX iAmmo = 0; iAmmo < aList.Count(); iAmmo++) {
    CTString strFile = aList[iAmmo].str_String;

    // Parse the config
    CAmmoStruct *pasAmmo = new CAmmoStruct();
    ParseAmmoConfig(pasAmmo, strAmmoSet, strFile);

    // Add the ammo
    AddAmmo(pasAmmo);
  }
};
