#include "StdH.h"
#include "ExtraFunc.h"
#include "ConfigFunc.h"

#include "EntitiesMP/DoorController.h"
#include "EntitiesMP/KeyItem.h"
#include "EntitiesMP/PlayerMarker.h"
#include "EntitiesMP/PlayerWeapons.h"
#include "EntitiesMP/WorldBase.h"

// [Cecil] TFE weapon flags to TSE flags
void ConvertWeapon(INDEX &iFlags, const INDEX &iWeapon) {
  switch (iWeapon) {
    // Laser
    case 14:
      iFlags |= WeaponFlag(WEAPON_LASER);
      break;

    // Cannon
    case 16:
      iFlags |= WeaponFlag(WEAPON_IRONCANNON);
      break;

    // non-existent weapons
    case 10: case 12: case 15: case 17:
    case WEAPON_FLAMER: case WEAPON_SNIPER:
      break;

    default: iFlags |= WeaponFlag(iWeapon);
  }
};

// [Cecil] Convert world if needed
extern void ConvertWorld(CEntity *penWorld) {
  // get first world base
  CWorldBase *penBase = NULL;

  {FOREACHINDYNAMICCONTAINER(penWorld->GetWorld()->wo_cenEntities, CEntity, iten) {
    CEntity *pen = iten;

    if (!IsOfClass(pen, "WorldBase")) {
      continue;
    }

    penBase = (CWorldBase*)pen;
    break;
  }}

  // no world base
  if (penBase == NULL) {
    CPrintF(" World conversion failed:\n - Unable to find the first WorldBase!\n");
    return;
  }

  // mark as reinitialized
  if (penBase->m_bReinit) {
    return;
  } else {
    penBase->m_bReinit = TRUE;
  }

  INDEX iReinit = 0;
  CPrintF(" Converting TFE level into TSE level...\n");

  {FOREACHINDYNAMICCONTAINER(penWorld->GetWorld()->wo_cenEntities, CEntity, iten) {
    CEntity *pen = iten;

    // [Cecil] Check for the entities that NEED to be updated rather than the ones that don't
    if (!IsDerivedFromClass(pen, "Enemy Base") && !IsOfClass(pen, "Enemy Spawner")
     && !IsOfClass(pen, "Camera")
     && !IsOfClass(pen, "Trigger") && !IsOfClass(pen, "KeyItem") && !IsOfClass(pen, "Moving Brush")
     && !IsOfClass(pen, "Storm controller") && !IsOfClass(pen, "PyramidSpaceShip") && !IsOfClass(pen, "Lightning")
     && !IsOfClass(pen, "DoorController") && !IsOfClass(pen, "Touch Field")
     && !IsOfClass(pen, "Player Marker") && !IsOfClass(pen, "Player Weapons")) {
      continue;
    }
  
    if (IsOfClass(pen, "Player Weapons")) {
      CPlayerWeapons *penWeapons = (CPlayerWeapons *)pen;
      INDEX *piWeapons = &penWeapons->m_iAvailableWeapons;
      INDEX iWeapons = *piWeapons & ~GetSP()->sp_iWeaponGiver;
      INDEX iNewWeapons = 0x03;

      for (INDEX iGetWeapon = 1; iGetWeapon < 18; iGetWeapon++) {
        // replace the weapon if we have it
        if (WeaponExists(iWeapons, iGetWeapon)) {
          ConvertWeapon(iNewWeapons, iGetWeapon);
        }
      }
      *piWeapons = iNewWeapons | GetSP()->sp_iWeaponGiver;
      CPrintF(" - Converted PlayerWeapons\n");

    } else if (IsOfClass(pen, "Player Marker")) {
      CPlayerMarker *penWeapons = (CPlayerMarker *)pen;
      INDEX *piWeapons = &penWeapons->m_iGiveWeapons;
      INDEX *piTakeWeapons = &penWeapons->m_iTakeWeapons;
      INDEX iNewWeapons = 0x03;
      INDEX iNewTakeWeapons = 0;

      for (INDEX iGetWeapon = 1; iGetWeapon < 18; iGetWeapon++) {
        // replace the weapon if we have it
        if (WeaponExists(*piWeapons, iGetWeapon)) {
          ConvertWeapon(iNewWeapons, iGetWeapon);
        }
    
        if (WeaponExists(*piTakeWeapons, iGetWeapon)) {
          ConvertWeapon(iNewTakeWeapons, iGetWeapon);
        }
      }
      *piWeapons = iNewWeapons;
      *piTakeWeapons = iNewTakeWeapons;
      CPrintF(" - Converted PlayerMarker\n");

    } else if (IsOfClass(pen, "KeyItem")) {
      CKeyItem *penKey = (CKeyItem *)pen;
      
      switch (penKey->m_kitType) {
        // Dummy keys
        case 4: penKey->m_kitType = KIT_JAGUARGOLDDUMMY; break;
        case 15: penKey->m_kitType = KIT_TABLESDUMMY; break;

        // Element keys
        case 5: penKey->m_kitType = KIT_CROSSWOODEN; break;
        case 6: penKey->m_kitType = KIT_CROSSMETAL; break;
        case 7: penKey->m_kitType = KIT_CRYSTALSKULL; break;
        case 8: penKey->m_kitType = KIT_CROSSGOLD; break;

        // Other keys
        default: penKey->m_kitType = KIT_KINGSTATUE; break;
      }

      penKey->Reinitialize();
      CPrintF(" - Converted KeyItem\n");
      iReinit++;

    } else if (IsOfClass(pen, "DoorController")) {
      CDoorController *penDoor = (CDoorController *)pen;
      
      switch (penDoor->m_kitKey) {
        // Dummy keys
        case 4: penDoor->m_kitKey = KIT_JAGUARGOLDDUMMY; break;
        case 15: penDoor->m_kitKey = KIT_TABLESDUMMY; break;

        // Element keys
        case 5: penDoor->m_kitKey = KIT_CROSSWOODEN; break;
        case 6: penDoor->m_kitKey = KIT_CROSSMETAL; break;
        case 7: penDoor->m_kitKey = KIT_CRYSTALSKULL; break;
        case 8: penDoor->m_kitKey = KIT_CROSSGOLD; break;

        // Other keys
        default: penDoor->m_kitKey = KIT_KINGSTATUE; break;
      }

      penDoor->Reinitialize();
      CPrintF(" - Converted DoorController\n");
      iReinit++;

    } else {
      pen->Reinitialize();
      iReinit++;
    }
  }}

  CPrintF(" - Reinitialized %i entities. Conversion end -\n", iReinit);
};

// [Cecil] Properly remove decorations from the string
void ProperUndecorate(CTString &str) {
  // make a copy of the string to hold the result - we will rewrite it without the codes
  CTString strResult = str;

  // start at the beginning of both strings
  const char *pchSrc = str.str_String;
  char *pchDst = strResult.str_String;

  // while the source is not finished
  while (pchSrc[0] != 0) {
    // if the source char is not escape char
    if (pchSrc[0] != '^') {
      // copy it over
      *pchDst++ = *pchSrc++;
      continue;
    }
    
    // check the next char
    switch (pchSrc[1]) {
      // if one of the control codes, skip corresponding number of characters
      case 'c': pchSrc += 2 + FindZero((UBYTE*)pchSrc+2, 6); break;
      case 'a': pchSrc += 2 + FindZero((UBYTE*)pchSrc+2, 2); break;
      case 'f': pchSrc += 2 + FindZero((UBYTE*)pchSrc+2, 1); break;
      
      case 'b': case 'i': case 'r': case 'o':
      case 'C': case 'A': case 'F': case 'B': case 'I':
        pchSrc += 2;
        break;

      case '^':
        pchSrc++;
        *pchDst++ = *pchSrc++;
        break;

      // something else
      default:
        *pchDst++ = *pchSrc++;
        break;
    }
  }
  
  *pchDst++ = 0;
  str = strResult;
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
        if (pen->IsPredictor()) {
          return pen->GetPredicted();
        }
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
void ParseModelConfig(DJSON_Block &mapBlock, CModelObject *pmo, CAttachmentModelObject *pamoAttachment) {
  INDEX ctValues = mapBlock.Count();

  for (INDEX iValue = 0; iValue < ctValues; iValue++) {
    // get config value
    string strName = mapBlock.GetKey(iValue);
    CConfigValue &cv = mapBlock.GetValue(iValue);

    // load model
    if (strName == "Model") {
      ASSERT_VALUE_TYPE(cv, STRING);

      CTString strModel = CTString(cv.cv_strValue);
      if (pmo->GetData() == NULL || pmo->GetData()->ser_FileName != strModel) {
        pmo->SetData_t(strModel);
      }

    // load textures
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

    // apply animation
    } else if (strName == "Animation") {
      ASSERT_VALUE_TYPE(cv, INDEX);

      // get animation number
      INDEX iAnim = Clamp(INDEX(cv.cv_iValue), INDEX(0), INDEX(pmo->GetAnimsCt() - 1));
      pmo->PlayAnim(iAnim, AOF_LOOPING);

    // include another model
    } else if (strName == "Include") {
      ASSERT_VALUE_TYPE(cv, STRING);
      
      // load model config
      CConfigBlock cbInclude;
      BOOL bFailed = !LoadJSON(CTString(cv.cv_strValue), cbInclude);

      // set model
      if (!bFailed) {
        bFailed = !SetModelFromJSON(pmo, cbInclude);
      }

      if (bFailed) {
        ThrowF_t("Couldn't parse the included model! (%s)", cv.cv_strValue);
      }

    // attachment position
    } else if (strName == "Pos" || strName == "PosAdd") {
      if (pamoAttachment == NULL) {
        continue;

      } else {
        ASSERT_VALUE_TYPE(cv, ARRAY);

        DJSON_Array &aPos = cv.cv_aArray;
        if (aPos.Count() < 6) {
          ThrowF_t("Not enough attachment positions!");
        }

        // check the values
        for (INDEX iCheck = 0; iCheck < 6; iCheck++) {
          CConfigValue &cvPos = aPos[iCheck];

          if (cvPos.cv_eType != CVT_FLOAT && cvPos.cv_eType != CVT_INDEX) {
            ThrowF_t("One of the position values isn't a float number!");
          }
        }

        FLOAT3D vPos = FLOAT3D(aPos[0].GetNumber(), aPos[1].GetNumber(), aPos[2].GetNumber());
        ANGLE3D aRot = ANGLE3D(aPos[3].GetNumber(), aPos[4].GetNumber(), aPos[5].GetNumber());

        // set or add
        if (strName == "PosAdd") {
          pamoAttachment->amo_plRelative.pl_PositionVector += vPos;
          pamoAttachment->amo_plRelative.pl_OrientationAngle += aRot;
        } else {
          pamoAttachment->amo_plRelative = CPlacement3D(vPos, aRot);
        }
      }

    // attachments
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

        ParseModelConfig(cv.cv_mapBlock, &pamo->amo_moModelObject, pamo);

      } else {
        ThrowF_t("Expected attachment index for the attachment!");
      }

    // invalid argument
    } else {
      ThrowF_t("Invalid model argument '%s'!", strName.c_str());
    }
  }
};

// [Cecil] Load JSON config
BOOL LoadJSON(const CTFileName &fnJSON, DJSON_Block &mapModel) {
  HookConfigFunctions();

  // load the config
  return ParseConfig(fnJSON.str_String, mapModel);
};

// [Cecil] Set model from a JSON config
BOOL SetModelFromJSON(CModelObject *pmo, DJSON_Block &mapModel) {
  HookConfigFunctions();

  // parse the model
  try {
    ParseModelConfig(mapModel, pmo, NULL);
    return TRUE;

  } catch (char *strError) {
    CPrintF("[^cff0000JSON Error^r]: %s\n", strError);
    return FALSE;
  }

  return FALSE;
};
