#pragma once

#include "Weapons/WeaponModel.h"

// [Cecil] TFE weapon flags to TSE flags
DECL_DLL void ConvertWeaponTFE(INDEX &iFlags, const INDEX &iWeapon);

// [Cecil] TSE weapon flags to AMP2 flags
DECL_DLL void ConvertWeaponTSE(INDEX &iFlags, const INDEX &iWeapon);

// [Cecil] Properly remove decorations from the string
DECL_DLL void ProperUndecorate(CTString &str);

// [Cecil] Find proper character position in a decorated string
DECL_DLL INDEX PosInDecoratedString(const CTString &str, INDEX iChar);

// [Cecil] Get first alive player
DECL_DLL CEntity *GetFirstPlayer(const CTString &strExecutor = "<unknown>");

// [Cecil] Parse model config
DECL_DLL void ParseModelConfig(DJSON_Block &mapBlock, CModelObject *pmo, CAttachmentModelObject *pamoAttachment, CAttachList *paAttachments);

// [Cecil] Fill attachment list
DECL_DLL void ParseModelAttachments(DJSON_Block &mapBlock, CModelObject *pmo, CAttachmentModelObject *pamoAttachment, CAttachList &aAttachments);

// [Cecil] Load JSON config
void LoadJSON(const CTFileName &fnJSON, DJSON_Block &mapModel);

// [Cecil] Precache some resource
void PrecacheResource(EntityComponentType eType, const CTFileName &fnFile);

// --- TFE map patching

// World patching flag types
enum EWorldPatchFlags {
  WLDPF_PATCHED = (1 << 0), // At least one entity had its state patched
  WLDPF_IGNORE  = (1 << 1), // Ignore entity states and don't patch them
  WLDPF_TSE     = (1 << 2), // World is from The Second Encounter
  WLDPF_JOIN    = (1 << 3), // Client is joining the game
};

// World patching flags
extern ULONG _ulWorldPatching;

// [Cecil] Set to skip world patching
DECL_DLL void ResetWorldPatching(BOOL bJoining);

// [Cecil] Mark current map as a First Encounter map
void SetFirstEncounterMap(void);

// [Cecil] Mark current map as a Second Encounter map
void SetSecondEncounterMap(CEntity *pen);

// [Cecil] Report world patching debugging
#define REPORT_WORLD_PATCHING 0

#if REPORT_WORLD_PATCHING
  #define ENTITY_STATE_OUTPUT(Entity) if (!(_ulWorldPatching & (WLDPF_PATCHED | WLDPF_IGNORE))) CPrintF("%s (%d states) : 0x%08X\n", \
    Entity->en_pecClass->ec_pdecDLLClass->dec_strName, Entity->en_stslStateStack.Count(), Entity->en_stslStateStack[0])

#else
  #define ENTITY_STATE_OUTPUT(Entity) (void)Entity
#endif

// [Cecil] Check for an entity state
BOOL CheckEntityState(CRationalEntity *pen, const SLONG &slDesiredState);

// [Cecil] Patch entity state and return TRUE if it's been patched
BOOL PatchEntityState(CRationalEntity *pen, const SLONG &slDesiredState);

// [Cecil] Check if can patch entity states
DECL_DLL BOOL CanPatchStates(void);

// [Cecil] Check if playing a TFE map
DECL_DLL BOOL IsFirstEncounter(void);
