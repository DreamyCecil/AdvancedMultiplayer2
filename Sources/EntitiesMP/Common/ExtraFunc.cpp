#include "StdH.h"
#include "ExtraFunc.h"
#include "ConfigFunc.h"

#include "Engine/Entities/Precaching.h"
#include "Engine/Templates/Stock_CEntityClass.h"
#include "Engine/Templates/Stock_CModelData.h"
#include "Engine/Templates/Stock_CSoundData.h"
#include "Engine/Templates/Stock_CTextureData.h"

#include "EntitiesMP/DoorController.h"
#include "EntitiesMP/KeyItem.h"
#include "EntitiesMP/PlayerMarker.h"
#include "EntitiesMP/PlayerWeapons.h"
#include "EntitiesMP/WorldBase.h"

// [Cecil] Weapon flags
inline INDEX WeaponFlag(const INDEX &iWeapon) {
  return (1 << (iWeapon-1));
};

// [Cecil] TFE weapon flags to TSE flags
void ConvertWeaponTFE(INDEX &iFlags, const INDEX &iWeapon) {
  switch (iWeapon) {
    // Laser
    case 14: iFlags |= WeaponFlag(WEAPON_LASER); break;

    // Cannon (offsetted by 1 due to removal of WEAPON_DOUBLECOLT)
    case 16: iFlags |= WeaponFlag(WEAPON_IRONCANNON + 1); break;

    // non-existent weapons
    case 10: case 11: case 12: case 13: case 15: case 17: break;
    
    // other
    default: iFlags |= WeaponFlag(iWeapon);
  }
};

// [Cecil] TSE weapon flags to AMP2 flags
void ConvertWeaponTSE(INDEX &iFlags, const INDEX &iWeapon) {
  switch (iWeapon) {
    // Chainsaw
    case 10: iFlags |= WeaponFlag(WEAPON_CHAINSAW); break;

    // Flamer
    case 11: iFlags |= WeaponFlag(WEAPON_FLAMER); break;

    // Sniper
    case 13: iFlags |= WeaponFlag(WEAPON_SNIPER); break;

    // Cannon
    case 14: iFlags |= WeaponFlag(WEAPON_IRONCANNON); break;

    // other
    default: iFlags |= WeaponFlag(iWeapon);
  }
};

// [Cecil] Convert world if needed
extern void ConvertWorld(CEntity *penWorld) {
  // Get first world base
  extern CEntity *_penFirstWorldBase;

  if (_penFirstWorldBase == NULL) {
    FOREACHINDYNAMICCONTAINER(penWorld->GetWorld()->wo_cenEntities, CEntity, iten) {
      CEntity *pen = iten;

      if (!IsOfClass(pen, "WorldBase")) {
        continue;
      }

      _penFirstWorldBase = pen;
      break;
    }
  }

  // No world base
  if (_penFirstWorldBase == NULL) {
    CPrintF("World conversion failed:\n- Unable to find the first WorldBase!\n");
    return;
  }

  CWorldBase *penBase = (CWorldBase *)_penFirstWorldBase;

  // Mark as TFE map
  if (penBase->m_bTFEMap) {
    return;

  } else {
    penBase->m_bTFEMap = TRUE;
  }

  INDEX ctPatched = 0;
  CPrintF("- Converting TFE level into TSE level -\n");

  {FOREACHINDYNAMICCONTAINER(penWorld->GetWorld()->wo_cenEntities, CEntity, iten) {
    CEntity *pen = iten;

    // [Cecil] Check for the entities that need to be patched
    if (!IsOfClass(pen, "DoorController") && !IsOfClass(pen, "KeyItem") && !IsOfClass(pen, "Player Marker")) {
      continue;
    }

    // Adjust weapon masks
    if (IsOfClass(pen, "Player Marker")) {
      CPlayerMarker *penWeapons = (CPlayerMarker *)pen;
      INDEX *piWeapons = &penWeapons->m_iGiveWeapons;
      INDEX *piTakeWeapons = &penWeapons->m_iTakeWeapons;
      INDEX iNewWeapons = 0x03;
      INDEX iNewTakeWeapons = 0;

      for (INDEX iGetWeapon = 1; iGetWeapon < 18; iGetWeapon++) {
        // replace the weapon if we have it
        if (*piWeapons & WeaponFlag(iGetWeapon)) {
          ConvertWeaponTFE(iNewWeapons, iGetWeapon);
        }

        if (*piTakeWeapons & WeaponFlag(iGetWeapon)) {
          ConvertWeaponTFE(iNewTakeWeapons, iGetWeapon);
        }
      }

      CPrintF("[%u] Converted PlayerMarker (%d -> %d)\n", pen->en_ulID, *piWeapons, iNewWeapons);

      *piWeapons = iNewWeapons;
      *piTakeWeapons = iNewTakeWeapons;
      
    // Adjust keys
    } else if (IsOfClass(pen, "KeyItem")) {
      CKeyItem *penKey = (CKeyItem *)pen;
      KeyItemType eKey = penKey->m_kitType;

      switch (eKey) {
        // Dummy keys
        case 4:  eKey = KIT_JAGUARGOLDDUMMY; break;
        case 15: eKey = KIT_TABLESDUMMY; break;

        // Element keys
        case 5: eKey = KIT_CROSSWOODEN; break;
        case 6: eKey = KIT_CROSSMETAL; break;
        case 7: eKey = KIT_CRYSTALSKULL; break;
        case 8: eKey = KIT_CROSSGOLD; break;

        // Other keys
        default: eKey = KIT_KINGSTATUE; break;
      }

      CPrintF("[%u] Converted KeyItem (%d -> %d)\n", pen->en_ulID, penKey->m_kitType, eKey);

      penKey->m_kitType = eKey;

    // Adjust keys
    } else if (IsOfClass(pen, "DoorController")) {
      CDoorController *penDoor = (CDoorController *)pen;

      // Only for locked doors
      if (penDoor->m_dtType != DT_LOCKED) {
        continue;
      }

      KeyItemType eKey = penDoor->m_kitKey;

      switch (eKey) {
        // Dummy keys
        case 4:  eKey = KIT_JAGUARGOLDDUMMY; break;
        case 15: eKey = KIT_TABLESDUMMY; break;

        // Element keys
        case 5: eKey = KIT_CROSSWOODEN; break;
        case 6: eKey = KIT_CROSSMETAL; break;
        case 7: eKey = KIT_CRYSTALSKULL; break;
        case 8: eKey = KIT_CROSSGOLD; break;

        // Other keys
        default: eKey = KIT_KINGSTATUE; break;
      }

      CPrintF("[%u] Converted DoorController (%d -> %d)\n", pen->en_ulID, penDoor->m_kitKey, eKey);

      penDoor->m_kitKey = eKey;
    }

    ctPatched++;
  }}

  CPrintF("- Patched %d entities. Conversion end -\n", ctPatched);
};

// [Cecil] Properly remove decorations from the string
void ProperUndecorate(CTString &str) {
  // Make a copy of the string to hold the result - we will rewrite it without the codes
  CTString strResult = str;

  // Start at the beginning of both strings
  const char *pchSrc = str.str_String;
  char *pchDst = strResult.str_String;

  // While the source is not finished
  while (pchSrc[0] != 0) {
    // If the source char is not escape char
    if (pchSrc[0] != '^') {
      // Copy it over
      *pchDst++ = *pchSrc++;
      continue;
    }
    
    // Check the next char
    switch (pchSrc[1]) {
      // If one of the control codes, skip corresponding number of characters
      case 'c': pchSrc += 2 + FindZero((UBYTE *)pchSrc + 2, 6); break;
      case 'a': pchSrc += 2 + FindZero((UBYTE *)pchSrc + 2, 2); break;
      case 'f': pchSrc += 2 + FindZero((UBYTE *)pchSrc + 2, 1); break;
      
      case 'b': case 'i': case 'r': case 'o':
      case 'C': case 'A': case 'F': case 'B': case 'I':
        pchSrc += 2;
        break;

      case '^':
        pchSrc++;
        *pchDst++ = *pchSrc++;
        break;

      // Something else
      default:
        *pchDst++ = *pchSrc++;
        break;
    }
  }
  
  *pchDst++ = 0;
  str = strResult;
};

// [Cecil] Find proper character position in a decorated string
INDEX PosInDecoratedString(const CTString &str, INDEX iChar) {
  // Start at the beginning of a string
  const char *pchSrc = str.str_String;
  INDEX ctTags = 0;

  // Until the desired character index
  while (--iChar >= 0) {
    // String end
    if (pchSrc[0] == 0) {
      break;
    }

    // If the source char is not escape char
    if (pchSrc[0] != '^') {
      // Count it normally
      pchSrc++;
      continue;
    }
    
    // Skip however many tag characters there are
    switch (pchSrc[1]) {
      case 'c': pchSrc += 2 + FindZero((UBYTE *)pchSrc + 2, 6); break;
      case 'a': pchSrc += 2 + FindZero((UBYTE *)pchSrc + 2, 2); break;
      case 'f': pchSrc += 2 + FindZero((UBYTE *)pchSrc + 2, 1); break;
      
      case '^': case 'b': case 'i': case 'r': case 'o':
      case 'C': case 'A': case 'F': case 'B': case 'I':
        pchSrc += 2;
        break;
    }

    // Skipped one full tag
    ctTags++;
  }

  // Difference between the string beginning and where we stopped
  return INDEX(pchSrc - str.str_String) + ctTags;
};

// [Cecil] Get first alive player
CEntity *GetFirstPlayer(const CTString &strExecutor) {
  CEntity *penOne = NULL;
  
  // [Cecil] NOTE: May potentially be the cause of the crashes by not being able to decide the first player for other clients
  for (INDEX iPlayer = 0; iPlayer < CEntity::GetMaxPlayers(); iPlayer++) {
    CEntity *pen = CEntity::GetPlayerEntity(iPlayer);

    if (ASSERT_ENTITY(pen)) {
      penOne = pen;

      if (IsAlive(pen)) {
        return pen;
      }
    }
  }

  CPrintF("  ^cff0000WARNING! Cutscene chain is broken, unable to find alive players!\n^r(executed by %s^r)", strExecutor);
  return penOne;
};

// [Cecil] Check for the right type
#define ASSERT_VALUE_TYPE(_Value, _Type) \
  if (_Value.cv_eType != CVT_##_Type) { \
    ThrowF_t("Expected %s value for the '%s' argument!", #_Type, strName.c_str()); \
  }

// [Cecil] Parse model config
void ParseModelConfig(DJSON_Block &mapBlock, CModelObject *pmo, CAttachmentModelObject *pamoAttachment, CAttachList *paAttachments) {
  INDEX ctValues = mapBlock.Count();

  for (INDEX iValue = 0; iValue < ctValues; iValue++) {
    // get config value
    string strName = mapBlock.GetKey(iValue);
    CConfigValue &cv = mapBlock.GetValue(iValue);

    // Load model
    if (strName == "Model") {
      ASSERT_VALUE_TYPE(cv, STRING);
      pmo->SetData_t(CTString(cv.cv_strValue));

    // Load textures
    } else if (strName == "Texture") {
      ASSERT_VALUE_TYPE(cv, STRING);
      pmo->mo_toTexture.SetData_t(CTString(cv.cv_strValue));

    } else if (strName == "Reflection") {
      ASSERT_VALUE_TYPE(cv, STRING);
      pmo->mo_toReflection.SetData_t(CTString(cv.cv_strValue));

    } else if (strName == "Specular") {
      ASSERT_VALUE_TYPE(cv, STRING);
      pmo->mo_toSpecular.SetData_t(CTString(cv.cv_strValue));

    } else if (strName == "Bump") {
      ASSERT_VALUE_TYPE(cv, STRING);
      pmo->mo_toBump.SetData_t(CTString(cv.cv_strValue));

    // Resize model
    } else if (strName == "Scale") {
      ASSERT_VALUE_TYPE(cv, ARRAY);

      DJSON_Array &aScale = cv.cv_aArray;

      if (aScale.Count() < 3) {
        ThrowF_t("Not enough scale dimensions!");
      }

      // Check the values
      for (INDEX iCheck = 0; iCheck < 3; iCheck++) {
        CConfigValue &cvPos = aScale[iCheck];

        if (cvPos.cv_eType != CVT_FLOAT && cvPos.cv_eType != CVT_INDEX) {
          ThrowF_t("One of the scale values isn't a float number!");
        }
      }

      FLOAT3D vScale(aScale[0].GetNumber(), aScale[1].GetNumber(), aScale[2].GetNumber());
      pmo->StretchModel(vScale);

    // Flagged element
    } else if (strName == "Flag") {
      if (paAttachments == NULL) {
        continue;
      }

      CAttachList &aAttachments = *paAttachments;

      // Single flag as a string
      if (cv.cv_eType == CVT_STRING) {
        // Add to the attachment list
        aAttachments[cv.cv_strValue] = SListModel(pamoAttachment, pmo);

      // Multiple flags as an array
      } else if (cv.cv_eType == CVT_ARRAY) {
        DJSON_Array &aArray = cv.cv_aArray;

        for (INDEX i = 0; i < aArray.Count(); i++) {
          ASSERT_VALUE_TYPE(aArray[i], STRING);

          // Add to the attachment list
          aAttachments[aArray[i].cv_strValue] = SListModel(pamoAttachment, pmo);
        }

      // Invalid type
      } else {
        ASSERT_VALUE_TYPE(cv, STRING);
      }

    // Apply animation
    } else if (strName == "Animation") {
      ASSERT_VALUE_TYPE(cv, INDEX);

      // Get animation number
      INDEX iAnim = Clamp(INDEX(cv.cv_iValue), INDEX(0), INDEX(pmo->GetAnimsCt() - 1));
      pmo->PlayAnim(iAnim, AOF_LOOPING);

    // Include another model
    } else if (strName == "Include") {
      ASSERT_VALUE_TYPE(cv, STRING);
      
      // Load model config
      CConfigBlock cbInclude;

      try {
        LoadJSON(CTString(cv.cv_strValue), cbInclude);

      } catch (char *strError) {
        ThrowF_t("Couldn't parse the included model \"%s\": %s", cv.cv_strValue, strError);
      }

      // Set model
      ParseModelConfig(cbInclude, pmo, NULL, paAttachments);

    // Attachment position
    } else if (strName == "Pos" || strName == "PosAdd") {
      if (pamoAttachment == NULL) {
        continue;

      } else {
        ASSERT_VALUE_TYPE(cv, ARRAY);

        DJSON_Array &aPos = cv.cv_aArray;
        if (aPos.Count() < 6) {
          ThrowF_t("Not enough attachment positions!");
        }

        // Check the values
        for (INDEX iCheck = 0; iCheck < 6; iCheck++) {
          CConfigValue &cvPos = aPos[iCheck];

          if (cvPos.cv_eType != CVT_FLOAT && cvPos.cv_eType != CVT_INDEX) {
            ThrowF_t("One of the position values isn't a float number!");
          }
        }

        FLOAT3D vPos(aPos[0].GetNumber(), aPos[1].GetNumber(), aPos[2].GetNumber());
        ANGLE3D aRot(aPos[3].GetNumber(), aPos[4].GetNumber(), aPos[5].GetNumber());

        // Set or add
        if (strName == "PosAdd") {
          pamoAttachment->amo_plRelative.pl_PositionVector += vPos;
          pamoAttachment->amo_plRelative.pl_OrientationAngle += aRot;
        } else {
          pamoAttachment->amo_plRelative = CPlacement3D(vPos, aRot);
        }
      }

    // Attachments
    } else if (CTString(strName.c_str()).HasPrefix("Attachment")) {
      INDEX iAttach;

      if (CTString(strName.c_str()).ScanF("Attachment %i", &iAttach) > 0) {
        ASSERT_VALUE_TYPE(cv, BLOCK);

        // Invalid index
        if (iAttach < 0) {
          ThrowF_t("Invalid attachment number!");
        }

        CModelData *pmd = (CModelData*)pmo->GetData();

        // Too many attachments
        if (iAttach >= pmd->md_aampAttachedPosition.Count()) {
          ThrowF_t("Attachment %d does not exist!", iAttach);
        }

        // Attach the model
        CAttachmentModelObject *pamo = pmo->GetAttachmentModel(iAttach);
        if (pamo == NULL) {
          pamo = pmo->AddAttachmentModel(iAttach);
        }

        ParseModelConfig(cv.cv_mapBlock, &pamo->amo_moModelObject, pamo, paAttachments);

      } else {
        ThrowF_t("Expected attachment index for the attachment!");
      }

    // Invalid argument
    } else {
      ThrowF_t("Invalid model argument '%s'!", strName.c_str());
    }
  }
};

// [Cecil] Fill attachment list
void ParseModelAttachments(DJSON_Block &mapBlock, CModelObject *pmo, CAttachmentModelObject *pamoAttachment, CAttachList &aAttachments) {
  INDEX ctValues = mapBlock.Count();

  for (INDEX iValue = 0; iValue < ctValues; iValue++) {
    // Get config value
    string strName = mapBlock.GetKey(iValue);
    CConfigValue &cv = mapBlock.GetValue(iValue);

    // Flagged element
    if (strName == "Flag") {
      // Single flag as a string
      if (cv.cv_eType == CVT_STRING) {
        // Add to the attachment list
        aAttachments[cv.cv_strValue] = SListModel(pamoAttachment, pmo);

      // Multiple flags as an array
      } else if (cv.cv_eType == CVT_ARRAY) {
        DJSON_Array &aArray = cv.cv_aArray;

        for (INDEX i = 0; i < aArray.Count(); i++) {
          ASSERT_VALUE_TYPE(aArray[i], STRING);

          // Add to the attachment list
          aAttachments[aArray[i].cv_strValue] = SListModel(pamoAttachment, pmo);
        }

      // Invalid type
      } else {
        ASSERT_VALUE_TYPE(cv, STRING);
      }

    // Include another model
    } else if (strName == "Include") {
      ASSERT_VALUE_TYPE(cv, STRING);
      
      // Load model config
      CConfigBlock cbInclude;

      try {
        LoadJSON(CTString(cv.cv_strValue), cbInclude);

      } catch (char *strError) {
        ThrowF_t("Couldn't parse the included model \"%s\": %s", cv.cv_strValue, strError);
      }

      // Parse attachments
      ParseModelAttachments(cbInclude, pmo, NULL, aAttachments);

    // Attachments
    } else if (CTString(strName.c_str()).HasPrefix("Attachment")) {
      INDEX iAttach;

      if (CTString(strName.c_str()).ScanF("Attachment %i", &iAttach) > 0) {
        ASSERT_VALUE_TYPE(cv, BLOCK);

        // Invalid index
        if (iAttach < 0) {
          ThrowF_t("Invalid attachment number!");
        }

        CModelData *pmd = (CModelData*)pmo->GetData();

        // Too many attachments
        if (iAttach >= pmd->md_aampAttachedPosition.Count()) {
          ThrowF_t("Attachment %d does not exist!", iAttach);
        }

        // Attach the model
        CAttachmentModelObject *pamo = pmo->GetAttachmentModel(iAttach);
        if (pamo == NULL) {
          pamo = pmo->AddAttachmentModel(iAttach);
        }

        ParseModelAttachments(cv.cv_mapBlock, &pamo->amo_moModelObject, pamo, aAttachments);

      } else {
        ThrowF_t("Expected attachment index for the attachment!");
      }
    }
  }
};

// [Cecil] Load JSON config
void LoadJSON(const CTFileName &fnJSON, DJSON_Block &mapModel) {
  // Function hooking
  static BOOL bConfigFuncHooked = FALSE;

  if (!bConfigFuncHooked) {
    DJSON_pErrorFunction = (void (*)(const char *))ThrowF_t;
    DJSON_pPrintFunction = (void (*)(const char *))CPrintF;
    DJSON_pLoadConfigFile = (DJSON_String (*)(DJSON_String))LoadConfigFile;

    bConfigFuncHooked = TRUE;
  }

  // No config file
  if (!FileExists(fnJSON)) {
    ThrowF_t("Config file does not exist!", fnJSON.str_String);
    return;
  }

  // Load the config (throws a string on error)
  ParseConfig(fnJSON.str_String, mapModel);
};

// [Cecil] Precache some resource
void PrecacheResource(EntityComponentType eType, const CTFileName &fnFile) {
  // no resource
  if (!FileExists(fnFile)) {
    return;
  }

  CSerial *pser = NULL;
  INDEX ctUsed = 0;

  CTmpPrecachingNow tpn;

  // check the component type
  switch (eType) {
    // if texture
    case ECT_TEXTURE:
      // obtain texture data
      pser = _pTextureStock->Obtain_t(fnFile);
      ctUsed = pser->GetUsedCount();
      break;

    // if model
    case ECT_MODEL:
      // obtain model data
      pser = _pModelStock->Obtain_t(fnFile);
      ctUsed = pser->GetUsedCount();
      break;

    // if sound
    case ECT_SOUND:
      // obtain sound data
      pser = _pSoundStock->Obtain_t(fnFile);
      ctUsed = pser->GetUsedCount();
      break;

    // if class
    case ECT_CLASS:
      // obtain entity class
      pser = _pEntityClassStock->Obtain_t(fnFile);
      ctUsed = pser->GetUsedCount();
      break;

    // something else
    default: ThrowF_t(TRANS("Component '%s' is of unknown type!"), fnFile.str_String);
  }

  // if not already loaded and should not be precaching now
  if (ctUsed <= 1 && !_precache_bNowPrecaching) {
    // report warning
    CPrintF(TRANS("Not precached: (0x%08X)'%s'\n"), 0, fnFile.str_String);
  }

  if (pser != NULL) {
    pser->AddToCRCTable();
  }
};
