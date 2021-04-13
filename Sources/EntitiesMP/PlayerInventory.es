408
%{
#include "StdH.h"
#include "EntitiesMP/Player.h"
#include "EntitiesMP/PlayerWeapons.h"

#define PLAYER_POWERUPS 4

// Max powerup times
static const FLOAT _afPowerupMaxTime[PLAYER_POWERUPS] = {
  30.0f,
  30.0f,
  40.0f,
  20.0f,
};

// Powerup factors
static const FLOAT _afPowerupFactor[PLAYER_POWERUPS] = {
  0.0625f, // alpha percentage (other players)
  0.0f, // received damage
  4.0f, // damage multiplier
  2.0f, // speed multiplier
};
%}

uses "EntitiesMP/PowerUpItem";

// Input parameter for the inventory
event EInventoryInit {
  CEntityPointer penPlayer, // who owns it
};

%{
void CPlayerInventory_Precache(void) {
  CDLLEntityClass *pdec = &CPlayerInventory_DLLClass;
};
%}

class export CPlayerInventory : CRationalEntity {
name      "Player Inventory";
thumbnail "";
features  "CanBePredictable";

properties:
  1 CEntityPointer m_penPlayer, // player who owns it

 // Powerup timers
 10 FLOAT m_tmInvis  = 0.0f,
 11 FLOAT m_tmInvul  = 0.0f,
 12 FLOAT m_tmDamage = 0.0f,
 13 FLOAT m_tmSpeed  = 0.0f,

components:

functions:
  // Add to prediction any entities that this entity depends on
  void AddDependentsToPrediction(void) {
    m_penPlayer->AddToPrediction();
  }

  // Render particles
  void RenderParticles(void) {
  }

  // Powerup functions

  // Render powerup particles for some entity
  void PowerupParticles(CEntity *pen, CModelObject *pmo, const CPlacement3D &pl, const FLOAT2D &vFactors) {
    const FLOAT tmNow = _pTimer->CurrentTick();

    // invulnerability and damage
    const BOOL bInvul = m_tmInvul > tmNow;
    const BOOL bDamage = m_tmDamage > tmNow;

    if (bInvul && bDamage) {
      Particles_ModelGlow2(pmo, pl, Max(m_tmDamage, m_tmInvul), PT_STAR08, vFactors(1), 2, vFactors(2), 0xff00ff00);

    } else if (bInvul) {
      Particles_ModelGlow2(pmo, pl, m_tmInvul, PT_STAR05, vFactors(1), 2, vFactors(2), 0x3333ff00);

    } else if (bDamage) {
      Particles_ModelGlow2(pmo, pl, m_tmDamage, PT_STAR08, vFactors(1), 2, vFactors(2), 0xff777700);
    }

    // entity specific
    if (!ASSERT_ENTITY(pen)) {
      return;
    }

    if (m_tmSpeed > tmNow) {
      Particles_RunAfterBurner(pen, m_tmSpeed, 0.3f, 0);
    }
  };

  // Current powerup time
  FLOAT GetPowerupTime(INDEX iPowerup) {
    return (&m_tmInvis)[iPowerup];
  };

  // Remaining powerup time
  FLOAT GetPowerupRemaining(INDEX iPowerup) {
    return (&m_tmInvis)[iPowerup] - _pTimer->CurrentTick();
  };

  // Max powerup time
  FLOAT GetPowerupMaxTime(INDEX iPowerup) {
    return _afPowerupMaxTime[iPowerup];
  };

  // Activate some powerup
  void ActivatePowerup(INDEX iPowerup) {
    (&m_tmInvis)[iPowerup] = _pTimer->CurrentTick() + GetPowerupMaxTime(iPowerup) * GetSP()->sp_fPowerupTimeMul;
  };

  // Check if a powerup is active
  BOOL IsPowerupActive(INDEX iPowerup) {
    return (&m_tmInvis)[iPowerup] > _pTimer->CurrentTick();
  };

  // Reset powerup timers
  void ResetPowerups(void) {
    for (INDEX i = 0; i < PLAYER_POWERUPS; i++) {
      (&m_tmInvis)[i] = 0.0f;
    }
  };

  // Special powerup factor or multiplier
  FLOAT GetPowerupFactor(INDEX iPowerup) {
    return _afPowerupFactor[iPowerup];
  };

procedures:
  // Entry point
  Main(EInventoryInit eInit) {
    // remember the initial parameters
    ASSERT(eInit.penPlayer != NULL);
    m_penPlayer = eInit.penPlayer;
    ASSERT(IsOfClass(m_penOwner, "Player"));

    InitAsVoid();
    SetFlags(GetFlags() | ENF_CROSSESLEVELS);
    SetPhysicsFlags(EPF_MODEL_IMMATERIAL);
    SetCollisionFlags(ECF_IMMATERIAL);

    wait() {
      on (EBegin) : {
        resume;
      }

      on (EEnd) : {
        stop;
      }
    }
    
    // cease to exist
    Destroy();

    return;
  };
};
