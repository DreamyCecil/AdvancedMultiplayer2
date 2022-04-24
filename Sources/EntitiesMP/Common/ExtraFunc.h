#pragma once

#include "Weapons/WeaponModel.h"

// [Cecil] TFE weapon flags to TSE flags
DECL_DLL void ConvertWeaponTFE(INDEX &iFlags, const INDEX &iWeapon);

// [Cecil] TSE weapon flags to AMP2 flags
DECL_DLL void ConvertWeaponTSE(INDEX &iFlags, const INDEX &iWeapon);

// [Cecil] Properly remove decorations from the string
DECL_DLL void ProperUndecorate(CTString &str);

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
