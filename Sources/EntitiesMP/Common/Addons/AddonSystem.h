#pragma once

#include "AddonPack.h"

// Start addon system
DECL_DLL void InitAddons(void);

// Clear addon system
DECL_DLL void ClearAddons(void);

// Loaded addons
extern CStaticStackArray<CAddonPack> _aAddons;
