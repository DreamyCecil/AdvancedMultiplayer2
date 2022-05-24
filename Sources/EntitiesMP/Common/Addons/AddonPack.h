#pragma once

#include "Addon.h"

// A pack of different addons
class CAddonPack {
  public:
    // Meta data
    CTString ap_strFile; // Path to the addon
    CTString ap_strName; // Addon name
    CTString ap_strAuthor; // Addon creator

    CStaticStackArray<CAddon> ap_aAddons; // Specific addons

  public:
    // Constructor
    CAddonPack(void);

    // Destructor
    ~CAddonPack(void);

    // Load addon pack
    void LoadAddons(void);
};
