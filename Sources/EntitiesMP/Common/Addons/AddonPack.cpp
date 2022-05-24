#include "StdH.h"

#include "AddonPack.h"
#include "EntitiesMP/Common/ConfigFunc.h"

// Constructor
CAddonPack::CAddonPack(void) : ap_strFile(""),
  ap_strName("Unnamed addon"), ap_strAuthor("Unknown") {};

// Destructor
CAddonPack::~CAddonPack(void) {
  // Remove addons from their lists
  for (INDEX i = 0; i < ap_aAddons.Count(); i++) {
    CAddon &addon = ap_aAddons[i];
    addon.RemoveFromList();
  }

  // Clear addons
  ap_aAddons.PopAll();
};

// Load addon pack
void CAddonPack::LoadAddons(void) {
  CConfigBlock cbAddonPack;

  try {
    LoadJSON(ap_strFile, cbAddonPack);

  } catch (char *strError) {
    FatalError("Couldn't load addon pack '%s':\n%s", ap_strFile, strError);
  }

  // Get addon meta data
  GetConfigString(cbAddonPack, "Name", ap_strName);
  GetConfigString(cbAddonPack, "Author", ap_strAuthor);

  // Get addons
  CConfigBlock cbAddons;

  if (!cbAddonPack.GetValue("Addons", cbAddons)) {
    FatalError("Couldn't load addon pack '%s':\nExpected 'Addons' block!", ap_strFile);
  }

  // Go through addon types
  for (INDEX iType = 0; iType < CAddon::ADT_LAST; iType++) {
    DJSON_Array aAddons;
    const char *strAddonType = CAddon::astrAddonTypes[iType];

    // Get array of addons of this type
    if (!cbAddons.GetValue(strAddonType, aAddons)) {
      continue;
    }

    for (INDEX iAddon = 0; iAddon < aAddons.size(); iAddon++) {
      CConfigValue &cv = aAddons[iAddon];

      // Must be a string
      if (cv.cv_eType != CVT_STRING) {
        FatalError("Couldn't load addon pack '%s':\nExpected strings in the array of '%s' addons!", ap_strFile, strAddonType);
      }

      // Add new addon
      CAddon &addon = ap_aAddons.Push();

      addon.eType = (CAddon::EAddonType)iType;
      addon.strAddon = cv.cv_strValue;

      addon.AddToList();
    }
  }
};
