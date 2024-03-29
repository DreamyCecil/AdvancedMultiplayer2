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

// Load the config
void LoadClassPatchConfig(CTString strWorld) {
  _cbConfig.Clear();

  // get global config
  CTString strConfigFile;
  strConfigFile.PrintF("LevelPatches\\GlobalClasses.json");

  // load if possible
  try {
    LoadJSON(strConfigFile, _cbConfig);

  } catch (char *strError) {
    WarningMessage("Couldn't parse global class patch config \"%s\": %s", strConfigFile, strError);
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

  try {
    LoadJSON(strConfigFile, cbLevel);

  } catch (char *strError) {
    // can't parse the config
    FatalError("Couldn't parse level class patch config \"%s\": %s", strConfigFile, strError);
    return;
  }

  // add level entries to global entries
  _cbConfig.AddFrom(cbLevel, true);
};
