2003
%{
#include "StdH.h"
#include "EntitiesMP/Player.h"

// Pointer to this entity
extern CEntity *_penGlobalController = NULL;

extern void ConvertWorld(CWorld *pwo);
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

  // Initialization
  void OnInitialize(const CEntityEvent &eeInput) {
    CRationalEntity::OnInitialize(eeInput);
    
    // Convert TFE map
    ConvertTFE();
  };

  // Destruction
  void OnEnd(void) {
    CRationalEntity::OnEnd();

    // Reset pointer from itself
    if (_penGlobalController == this) {
      _penGlobalController = NULL;
    }
  };

  // Read the controller
  void Read_t(CTStream *istr) {
    CRationalEntity::Read_t(istr);

    // Don't patch states after loading in
    ResetWorldPatching(TRUE);
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
    // Definitely a TSE map, so no patching
    if (_ulWorldPatching & WLDPF_TSE) {
      m_bFirstEncounter = FALSE;

      // Set constant flags
      SetSecondEncounterMap(NULL);
      return;
    }

    // Mark as a TFE map
    m_bFirstEncounter = (_ulWorldPatching & WLDPF_PATCHED);

    // Convert from TFE to TSE
    if (m_bFirstEncounter) {
      _ulWorldPatching |= WLDPF_IGNORE;
      ConvertWorld(GetWorld());
    }
  };

procedures:
  Main() {
    InitAsVoid();
    SetPhysicsFlags(EPF_MODEL_IMMATERIAL);
    SetCollisionFlags(ECF_IMMATERIAL);

    // travel between levels
    SetFlags(GetFlags()|ENF_CROSSESLEVELS|ENF_NOTIFYLEVELCHANGE);

    wait() {
      on (EBegin) : { resume; }

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
        // Reset world patching
        ResetWorldPatching(FALSE);
        resume;
      }

      on (EPostLevelChange) : {
        // Convert TFE map
        ConvertTFE();
        resume;
      }

      otherwise() : { resume; }
    }

    return;
  };
};
