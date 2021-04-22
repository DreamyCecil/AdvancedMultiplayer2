#include "StdH.h"

#include "PatchFunctions.h"
#include "EntitiesMP/Common/ConfigFunc.h"

// Custom patches
#include "EntitiesMP/Common/Patches/StockFuncPatcher.h"

// Patch has been set
static BOOL _bSetPatches = FALSE;

// Set patches
void SetCustomPatches(void) {
  // already set
  if (_bSetPatches) {
    return;
  }

  CStockPatcher::SetPatch();

  _bSetPatches = TRUE;
};

// Unset patches
void UnsetCustomPatches(void) {
  // not set yet
  if (!_bSetPatches) {
    return;
  }

  CStockPatcher::UnsetPatch();

  _bSetPatches = FALSE;
};

// Patch config
extern DJSON_Block _cbConfig = DJSON_Block();
extern INDEX _ctConfigEntries = 0;

// Load the config
void LoadClassPatchConfig(CTString strWorld) {
  _cbConfig.Clear();
  _ctConfigEntries = 0;

  HookConfigFunctions();

  // get global config
  CTString strConfigFile;
  strConfigFile.PrintF("LevelPatches\\GlobalClasses.json");

  // load if exists
  if (!FileExists(strConfigFile) || ParseConfig(strConfigFile, _cbConfig) != DJSON_OK) {
    WarningMessage("Couldn't parse global class patch config \"%s\"!", strConfigFile);
    _cbConfig.Clear();
  }

  // get level config
  strConfigFile.PrintF("LevelPatches\\Classes\\%s.json", strWorld);

  // no config
  if (!FileExists(strConfigFile)) {
    return;
  }

  // load level config
  DJSON_Block cbLevel;

  if (ParseConfig(strConfigFile, cbLevel) != DJSON_OK) {
    // can't parse the config
    FatalError("Cannot parse class patch \"%s\"!", strConfigFile);
    return;
  }

  // add level entries to global entries
  _cbConfig.AddFrom(cbLevel, true);

  _ctConfigEntries = _cbConfig.Count();
};
