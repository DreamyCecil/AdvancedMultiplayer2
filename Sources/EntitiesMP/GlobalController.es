2003
%{
#include "StdH.h"
#include "EntitiesMP/Player.h"

// Pointer to this entity
extern CEntity *_penGlobalController = NULL;

extern void ConvertWorld(CWorld *pwo);

// Check if the entity state doesn't match
static BOOL CheckEntityState(CRationalEntity *pen, SLONG slState, const char *strClass) {
  // Wrong entity class
  if (!IsOfClass(pen, strClass)) return FALSE;

  // No states at all, doesn't matter
  if (pen->en_stslStateStack.Count() <= 0) return FALSE;

  return pen->en_stslStateStack[0] != slState;
};
%}

// Remove certain player from the stop mask
event EStopMask {
  INDEX iPlayer,
};

// Get current auto action from some player
event EGlobalAction {
  CEntityPointer penCaused,
  CEntityPointer penAction,
};

class export CGlobalController : CRationalEntity {
name      "GlobalController";
thumbnail "";
features  "IsImportant";

properties:
// Cutscenes
 1 CEntityPointer m_penActor, // Player who started the cutscene
 2 CEntityPointer m_penCamera, // Current cutscene camera
 3 CEntityPointer m_penAction, // Current cutscene action
 4 INDEX m_iStopMask = 0,

// Center messages
10 CTString m_strMessage = "", // Current center message
11 FLOAT m_tmMessage = -100.0f, // Center message time
12 CSoundObject m_soMessage, // Global center message sound

20 BOOL m_bFirstEncounter = FALSE, // Playing a First Encounter map

components:
 1 sound SOUND_INFO "Sounds\\Player\\Info.wav",

functions:
  // Constructor
  void CGlobalController(void) {
    // Set pointer to this entity
    _penGlobalController = this;
  };

  // Destruction
  void OnEnd(void) {
    CRationalEntity::OnEnd();

    // Reset pointer from itself
    if (_penGlobalController == this) {
      _penGlobalController = NULL;
    }
  };

  // Count memory used by this object
  SLONG GetUsedMemory(void) {
    SLONG slUsedMemory = sizeof(CGlobalController) - sizeof(CRationalEntity) + CRationalEntity::GetUsedMemory();

    slUsedMemory += m_strMessage.Length();
    slUsedMemory += sizeof(m_soMessage);
    return slUsedMemory;
  };

  // Reset controller properties
  void Reset(void) {
    m_penActor = NULL;
    m_penCamera = NULL;
    m_penAction = NULL;
    m_iStopMask = 0;
  };

  // Check if it's the the cutscene actor
  BOOL IsActor(CEntity *pen) {
    return (m_penActor == pen->GetPredictionTail());
  };

  // Convert TFE maps if needed
  void ConvertTFE(void) {
    CDynamicContainer<CEntity> cEntities;
    m_bFirstEncounter = FALSE;

    FOREACHINDYNAMICCONTAINER(GetWorld()->wo_cenEntities, CEntity, iten) {
      CEntity *pen = iten;

      if (!ASSERT_ENTITY(pen)) {
        continue;
      }

      // Abort conversion if found TSE entities
      if (IsOfClass(pen, "CreditsHolder") || IsOfClass(pen, "EnvironmentParticlesHolder") || IsOfClass(pen, "Fireworks")
       || IsOfClass(pen, "HudPicHolder") || IsOfClass(pen, "MeteorShower") || IsOfClass(pen, "ModelHolder3")
       || IsOfClass(pen, "PhotoAlbum") || IsOfClass(pen, "PowerUp Item") || IsOfClass(pen, "Shooter")
       || IsOfClass(pen, "TacticsChanger") || IsOfClass(pen, "TacticsHolder") || IsOfClass(pen, "TimeController")
       // TSE enemies
       || IsOfClass(pen, "AirElemental") || IsOfClass(pen, "CannonRotating") || IsOfClass(pen, "CannonStatic")
       || IsOfClass(pen, "ChainsawFreak") || IsOfClass(pen, "Demon") || IsOfClass(pen, "ExotechLarva")
       || IsOfClass(pen, "Grunt") || IsOfClass(pen, "Guffy") || IsOfClass(pen, "Santa") || IsOfClass(pen, "Summoner"))
      {
        return;
      }

      CRationalEntity *penRE = (CRationalEntity *)pen;

      // Check for TFE states
      if (CheckEntityState(penRE, 0x00DC000A, "Camera")
       || CheckEntityState(penRE, 0x00DC000D, "Camera")
       || CheckEntityState(penRE, 0x01300043, "Enemy Spawner")
       || CheckEntityState(penRE, 0x025F0009, "Lightning")
       || CheckEntityState(penRE, 0x00650014, "Moving Brush")
       || CheckEntityState(penRE, 0x0261002E, "PyramidSpaceShip")
       || CheckEntityState(penRE, 0x025E000C, "Storm controller")
       || CheckEntityState(penRE, 0x014C013B, "Devil")
       || CheckEntityState(penRE, 0x0140001B, "Woman")) {
        cEntities.Add(pen);

      // Other TFE enemies
      } else if (IsDerivedFromClass(pen, "Enemy Base") && penRE->en_stslStateStack.Count() > 0) {
        if (penRE->en_stslStateStack[0] != 0x01360070) {
          cEntities.Add(pen);
        }
      }
    }

    if (cEntities.Count() > 0) {
      FOREACHINDYNAMICCONTAINER(cEntities, CEntity, itenReinit) {
        itenReinit->Reinitialize();
      }

      m_bFirstEncounter = TRUE;
      ConvertWorld(GetWorld());
    }
  };

procedures:
  Main() {
    InitAsVoid();
    SetPhysicsFlags(EPF_MODEL_IMMATERIAL);
    SetCollisionFlags(ECF_IMMATERIAL);

    // Travel between levels
    SetFlags(GetFlags() | ENF_CROSSESLEVELS | ENF_NOTIFYLEVELCHANGE);

    wait() {
      on (EBegin) : {
        // Convert TFE maps
        ConvertTFE();
        resume;
      }

      // retrieve center message
      on (ECenterMessage eMsg) : {
        m_strMessage = eMsg.strMessage;
        m_tmMessage = _pTimer->CurrentTick() + eMsg.tmLength;

        // play info sound
        if (eMsg.mssSound == MSS_INFO) {
          m_soMessage.Set3DParameters(100000.0f, 100000.0f, 1.0f, 1.0f);
          PlaySound(m_soMessage, SOUND_INFO, SOF_3D|SOF_VOLUMETRIC);
        }
        resume;
      }

      // start the camera
      on (ECameraStart eStart) : {
        m_penCamera = eStart.penCamera;

        // stop the players
        m_iStopMask = 0xFFFFFFFF;
        resume;
      }

      // stop the camera
      on (ECameraStop eCameraStop) : {
        CEntity *pen = eCameraStop.penCamera;

        // no camera or the same camera
        if (pen == NULL || m_penCamera == pen) {
          m_penCamera = NULL;
        }
        resume;
      }
      
      // remove player from the stop mask
      on (EStopMask eStop) : {
        INDEX iBit = (1 << eStop.iPlayer);

        m_iStopMask &= ~iBit;
        resume;
      }

      // retrieve action marker
      on (EGlobalAction eAction) : {
        // set current player and action
        m_penActor = eAction.penCaused;
        m_penAction = eAction.penAction;

        // tell that player to do actions
        EAutoAction eAutoAction;
        eAutoAction.penFirstMarker = m_penAction;
        m_penActor->SendEvent(eAutoAction);

        resume;
      }

      on (EPreLevelChange) : {
        resume;
      }

      on (EPostLevelChange) : {
        // Convert TFE maps
        ConvertTFE();
        resume;
      }

      otherwise() : { resume; }
    }

    return;
  };
};
