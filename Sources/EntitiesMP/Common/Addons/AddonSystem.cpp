#include "StdH.h"

#include "AddonSystem.h"

// Loaded addons
extern CStaticStackArray<CAddonPack> _aAddons = CStaticStackArray<CAddonPack>();

// Start addon system
void InitAddons(void) {
  ClearAddons();

  // Load addon pack list
  CDynamicStackArray<CTFileName> aList;
  MakeDirList(aList, CTFILENAME("UserAddons\\"), "*.json", 0);

  for (INDEX iAddon = 0; iAddon < aList.Count(); iAddon++) {
    // Add new addon pack
    CAddonPack &apNew = _aAddons.Push();

    // Remember path to the addon pack
    apNew.ap_strFile = aList[iAddon].str_String;

    // Load addon pack
    apNew.LoadAddons();
  }
};

// Clear addon system
void ClearAddons(void) {
  // Clear loaded addon packs
  _aAddons.PopAll();
};
