#include <Engine/Engine.h>
#include <GameMP/Game.h>
#include <GameMP/SEColors.h>

// rcg10042001 protect against Visual C-isms
#ifdef _MSC_VER
#define DECL_DLL _declspec(dllimport)
#endif

#ifdef PLATFORM_UNIX
#define DECL_DLL 
#endif

#include <EntitiesMP/Global.h>
#include <EntitiesMP/Common/Common.h>
#include <EntitiesMP/Common/GameInterface.h>
#include <EntitiesMP/Player.h>

// [Cecil] Custom weapons and ammo
#include "EntitiesMP/Common/Weapons/WeaponBase.h"

// [Cecil] Function patching
#include "EntitiesMP/Common/Patches/PatchFunctions.h"

// [Cecil] For initializing world patching
DECL_DLL void ResetWorldPatching(BOOL bJoining);

#undef DECL_DLL
