#include "StdH.h"
#include "ExtraFunc.h"

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
      //iFlags &= ~WeaponFlag(14);
      break;

    // Cannon
    case 16:
      iFlags |= WeaponFlag(WEAPON_IRONCANNON);
      //iFlags &= ~WeaponFlag(16);
      break;

    // non-existent weapons
    case 10: case 12: case 15: case 17:
    case WEAPON_FLAMER: case WEAPON_SNIPER:
      //iFlags &= ~WeaponFlag(iWeapon);
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
DECL_DLL void ProperUndecorate(CTString &str) {
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