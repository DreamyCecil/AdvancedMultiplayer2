#pragma once

#include <map>

// Map of addons of a certain type
typedef std::map<ULONG, class CAddon *> CAddonMap;

// Singular addon of a certain type
class CAddon {
  public:
    // Addon type
    enum EAddonType {
      ADT_WEAPONSET,

      ADT_LAST,
    };
  
    // Type names in the addon pack config
    static const char *astrAddonTypes[];
  
    // Addons per type under addon name hashes
    static CAddonMap mapAddons[CAddon::ADT_LAST];

    EAddonType eType; // Addon type
    CTString strAddon; // Addon name

    CAddonMap::iterator itInList; // Element in the addon map

  public:
    // Add to its addon list
    void AddToList(void);

    // Remove from its addon list
    void RemoveFromList(void);
};
