#include "StdH.h"

#include "Addon.h"

// Type names in the addon pack config
const char *CAddon::astrAddonTypes[] = {
  "WeaponSets",
};

// Addons per type under addon name hashes
CAddonMap CAddon::mapAddons[CAddon::ADT_LAST];

// Add to its addon list
void CAddon::AddToList(void) {
  // Put pointer to the addon under its hash
  std::pair<ULONG, CAddon *> pair(strAddon.GetHash(), this);

  // Insert it in the list
  std::pair<CAddonMap::iterator, bool> pairInserted = mapAddons[eType].insert(pair);
  ASSERTMSG(pairInserted.second, "Couldn't insert an addon in its list!");

  // Return iterator to it
  itInList = pairInserted.first;
};

// Remove from its addon list
void CAddon::RemoveFromList(void) {
  ASSERT(itInList != mapAddons[eType].end());

  mapAddons[eType].erase(itInList);
};
