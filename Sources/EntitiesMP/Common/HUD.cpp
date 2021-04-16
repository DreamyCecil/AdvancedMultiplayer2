 
#include "StdH.h"
#include "GameMP/SEColors.h"

#include <Engine/Graphics/DrawPort.h>

#include <EntitiesMP/Player.h>
#include <EntitiesMP/PlayerWeapons.h>
#include <EntitiesMP/MusicHolder.h>
#include <EntitiesMP/EnemyBase.h>
#include <EntitiesMP/EnemyCounter.h>

// [Cecil] Extra dependencies
#include "EntitiesMP/PlayerInventory.h"

// [Cecil] Extra functions
#include "EntitiesMP/Common/ExtraFunc.h"

#define ENTITY_DEBUG

// cheats
extern INDEX cht_bEnable;
extern INDEX cht_bGod;
extern INDEX cht_bFly;
extern INDEX cht_bGhost;
extern INDEX cht_bInvisible;
extern FLOAT cht_fTranslationMultiplier;

// interface control
extern INDEX hud_bShowInfo;
extern INDEX hud_bShowLatency;
extern INDEX hud_bShowMessages;
extern INDEX hud_iShowPlayers;
extern INDEX hud_iSortPlayers;
extern FLOAT hud_fOpacity;
extern FLOAT hud_fScaling;
extern FLOAT hud_tmWeaponsOnScreen;
extern INDEX hud_bShowMatchInfo;

// [Cecil] AMP 2 customization
extern INDEX amp_bEnemyCounter;

// [Cecil] Enemy counter
extern INDEX _iAliveEnemies;

// [Cecil] Voice commands menu
extern INDEX ctl_bVoiceCommands;
extern INDEX _iVoiceCommand;

// player statistics sorting keys
enum SortKeys {
  PSK_NAME    = 1,
  PSK_HEALTH  = 2,
  PSK_SCORE   = 3,
  PSK_MANA    = 4, 
  PSK_FRAGS   = 5,
  PSK_DEATHS  = 6,
};

// where is the bar lowest value
enum BarOrientations {
  BO_LEFT  = 1,
  BO_RIGHT = 2, 
  BO_UP    = 3,
  BO_DOWN  = 4,
};

// maximal mana for master status
#define MANA_MASTER 10000

// drawing variables
static const CPlayer *_penPlayer;

// [Cecil] Player's inventory
static CPlayerInventory *_penInventory;
static CPlayerWeapons *_penWeapons[2];

static CDrawPort *_pDP;
static PIX   _pixDPWidth, _pixDPHeight;
static FLOAT _fScalingX; // [Cecil] Renamed from _fResolutionScaling
static FLOAT _fScalingY; // [Cecil] Vertical scaling
static FLOAT _fCustomScaling;
static ULONG _ulAlphaHUD;
static COLOR _colHUD;
static COLOR _colHUDText;
static TIME  _tmNow = -1.0f;
static TIME  _tmLast = -1.0f;
static CFontData _fdNumbersFont;

// array for pointers of all players
extern CPlayer *_apenPlayers[NET_MAXGAMEPLAYERS] = {0};

// status bar textures
static CTextureObject _toHealth;
static CTextureObject _toOxygen;
static CTextureObject _toScore;
static CTextureObject _toHiScore;
static CTextureObject _toMessage;
static CTextureObject _toMana;
static CTextureObject _toFrags;
static CTextureObject _toDeaths;
static CTextureObject _toArmorSmall;
static CTextureObject _toArmorMedium;
static CTextureObject _toArmorLarge;

// ammo textures                    
static CTextureObject _toASeriousBomb;

// powerup textures (ORDER IS THE SAME AS IN PLAYER.ES!)
#define MAX_POWERUPS 4
static CTextureObject _atoPowerups[MAX_POWERUPS];
// tile texture (one has corners, edges and center)
static CTextureObject _toTile;
// sniper mask texture
static CTextureObject _toSniperMask;
static CTextureObject _toSniperWheel;
static CTextureObject _toSniperArrow;
static CTextureObject _toSniperEye;
static CTextureObject _toSniperLed;

// [Cecil] AMP 2 textures
static CTextureObject _toEnemyCount;
static CTextureObject _toComboToken;

// all info about color transitions
struct ColorTransitionTable {
  COLOR ctt_colFine;      // color for values over 1.0
  COLOR ctt_colHigh;      // color for values from 1.0 to 'fMedium'
  COLOR ctt_colMedium;    // color for values from 'fMedium' to 'fLow'
  COLOR ctt_colLow;       // color for values under fLow
  FLOAT ctt_fMediumHigh;  // when to switch to high color   (normalized float!)
  FLOAT ctt_fLowMedium;   // when to switch to medium color (normalized float!)
  BOOL  ctt_bSmooth;      // should colors have smooth transition
};
static struct ColorTransitionTable _cttHUD;

// compare functions for qsort()
static int qsort_CompareNames( const void *ppPEN0, const void *ppPEN1) {
  CPlayer &en0 = **(CPlayer**)ppPEN0;
  CPlayer &en1 = **(CPlayer**)ppPEN1;
  CTString strName0 = en0.GetPlayerName();
  CTString strName1 = en1.GetPlayerName();
  return strnicmp( strName0, strName1, 8);
}

static int qsort_CompareScores( const void *ppPEN0, const void *ppPEN1) {
  CPlayer &en0 = **(CPlayer**)ppPEN0;
  CPlayer &en1 = **(CPlayer**)ppPEN1;
  SLONG sl0 = en0.m_psGameStats.ps_iScore;
  SLONG sl1 = en1.m_psGameStats.ps_iScore;
  if(      sl0<sl1) return +1;
  else if( sl0>sl1) return -1;
  else              return  0;
}

static int qsort_CompareHealth( const void *ppPEN0, const void *ppPEN1) {
  CPlayer &en0 = **(CPlayer**)ppPEN0;
  CPlayer &en1 = **(CPlayer**)ppPEN1;
  SLONG sl0 = (SLONG)ceil(en0.GetHealth());
  SLONG sl1 = (SLONG)ceil(en1.GetHealth());
  if(      sl0<sl1) return +1;
  else if( sl0>sl1) return -1;
  else              return  0;
}

static int qsort_CompareManas( const void *ppPEN0, const void *ppPEN1) {
  CPlayer &en0 = **(CPlayer**)ppPEN0;
  CPlayer &en1 = **(CPlayer**)ppPEN1;
  SLONG sl0 = en0.m_iMana;
  SLONG sl1 = en1.m_iMana;
  if(      sl0<sl1) return +1;
  else if( sl0>sl1) return -1;
  else              return  0;
}

static int qsort_CompareDeaths( const void *ppPEN0, const void *ppPEN1) {
  CPlayer &en0 = **(CPlayer**)ppPEN0;
  CPlayer &en1 = **(CPlayer**)ppPEN1;
  SLONG sl0 = en0.m_psGameStats.ps_iDeaths;
  SLONG sl1 = en1.m_psGameStats.ps_iDeaths;
  if(      sl0<sl1) return +1;
  else if( sl0>sl1) return -1;
  else              return  0;
}

static int qsort_CompareFrags( const void *ppPEN0, const void *ppPEN1) {
  CPlayer &en0 = **(CPlayer**)ppPEN0;
  CPlayer &en1 = **(CPlayer**)ppPEN1;
  SLONG sl0 = en0.m_psGameStats.ps_iKills;
  SLONG sl1 = en1.m_psGameStats.ps_iKills;
  if(      sl0<sl1) return +1;
  else if( sl0>sl1) return -1;
  else              return -qsort_CompareDeaths(ppPEN0, ppPEN1);
}

static int qsort_CompareLatencies( const void *ppPEN0, const void *ppPEN1) {
  CPlayer &en0 = **(CPlayer**)ppPEN0;
  CPlayer &en1 = **(CPlayer**)ppPEN1;
  SLONG sl0 = (SLONG)ceil(en0.m_tmLatency);
  SLONG sl1 = (SLONG)ceil(en1.m_tmLatency);
  if(      sl0<sl1) return +1;
  else if( sl0>sl1) return -1;
  else              return  0;
}

// prepare color transitions
static void PrepareColorTransitions( COLOR colFine, COLOR colHigh, COLOR colMedium, COLOR colLow,
                                     FLOAT fMediumHigh, FLOAT fLowMedium, BOOL bSmooth)
{
  _cttHUD.ctt_colFine     = colFine;
  _cttHUD.ctt_colHigh     = colHigh;   
  _cttHUD.ctt_colMedium   = colMedium;
  _cttHUD.ctt_colLow      = colLow;
  _cttHUD.ctt_fMediumHigh = fMediumHigh;
  _cttHUD.ctt_fLowMedium  = fLowMedium;
  _cttHUD.ctt_bSmooth     = bSmooth;
}



// calculates shake ammount and color value depanding on value change
#define SHAKE_TIME (2.0f)
static COLOR AddShaker( PIX const pixAmmount, INDEX const iCurrentValue, INDEX &iLastValue,
                        TIME &tmChanged, FLOAT &fMoverX, FLOAT &fMoverY)
{
  // update shaking if needed
  fMoverX = fMoverY = 0.0f;
  const TIME tmNow = _pTimer->GetLerpedCurrentTick();
  if( iCurrentValue != iLastValue) {
    iLastValue = iCurrentValue;
    tmChanged  = tmNow;
  } else {
    // in case of loading (timer got reseted)
    tmChanged = ClampUp( tmChanged, tmNow);
  }
  
  // no shaker?
  const TIME tmDelta = tmNow - tmChanged;
  if( tmDelta > SHAKE_TIME) return NONE;
  ASSERT( tmDelta>=0);
  // shake, baby shake!
  const FLOAT fAmmount    = _fScalingX * _fCustomScaling * pixAmmount;
  const FLOAT fMultiplier = (SHAKE_TIME-tmDelta)/SHAKE_TIME *fAmmount;
  const INDEX iRandomizer = (INDEX)(tmNow*511.0f)*fAmmount*iCurrentValue;
  const FLOAT fNormRnd1   = (FLOAT)((iRandomizer ^ (iRandomizer>>9)) & 1023) * 0.0009775f;  // 1/1023 - normalized
  const FLOAT fNormRnd2   = (FLOAT)((iRandomizer ^ (iRandomizer>>7)) & 1023) * 0.0009775f;  // 1/1023 - normalized
  fMoverX = (fNormRnd1 -0.5f) * fMultiplier;
  fMoverY = (fNormRnd2 -0.5f) * fMultiplier;
  // clamp to adjusted ammount (pixels relative to resolution and HUD scale
  fMoverX = Clamp( fMoverX, -fAmmount, fAmmount);
  fMoverY = Clamp( fMoverY, -fAmmount, fAmmount);
  if( tmDelta < SHAKE_TIME/3) return C_WHITE;
  else return NONE;
//return FloatToInt(tmDelta*4) & 1 ? C_WHITE : NONE;
}


// get current color from local color transitions table
static COLOR GetCurrentColor( FLOAT fNormalizedValue)
{
  // if value is in 'low' zone just return plain 'low' alert color
  if( fNormalizedValue < _cttHUD.ctt_fLowMedium) return( _cttHUD.ctt_colLow & 0xFFFFFF00);
  // if value is in out of 'extreme' zone just return 'extreme' color
  if( fNormalizedValue > 1.0f) return( _cttHUD.ctt_colFine & 0xFFFFFF00);
 
  COLOR col;
  // should blend colors?
  if( _cttHUD.ctt_bSmooth)
  { // lets do some interpolations
    FLOAT fd, f1, f2;
    COLOR col1, col2;
    UBYTE ubH,ubS,ubV, ubH2,ubS2,ubV2;
    // determine two colors for interpolation
    if( fNormalizedValue > _cttHUD.ctt_fMediumHigh) {
      f1   = 1.0f;
      f2   = _cttHUD.ctt_fMediumHigh;
      col1 = _cttHUD.ctt_colHigh;
      col2 = _cttHUD.ctt_colMedium;
    } else { // fNormalizedValue > _cttHUD.ctt_fLowMedium == TRUE !
      f1   = _cttHUD.ctt_fMediumHigh;
      f2   = _cttHUD.ctt_fLowMedium;
      col1 = _cttHUD.ctt_colMedium;
      col2 = _cttHUD.ctt_colLow;
    }
    // determine interpolation strength
    fd = (fNormalizedValue-f2) / (f1-f2);
    // convert colors to HSV
    ColorToHSV( col1, ubH,  ubS,  ubV);
    ColorToHSV( col2, ubH2, ubS2, ubV2);
    // interpolate H, S and V components
    ubH = (UBYTE)(ubH*fd + ubH2*(1.0f-fd));
    ubS = (UBYTE)(ubS*fd + ubS2*(1.0f-fd));
    ubV = (UBYTE)(ubV*fd + ubV2*(1.0f-fd));
    // convert HSV back to COLOR
    col = HSVToColor( ubH, ubS, ubV);
  }
  else
  { // simple color picker
    col = _cttHUD.ctt_colMedium;
    if( fNormalizedValue > _cttHUD.ctt_fMediumHigh) col = _cttHUD.ctt_colHigh;
  }
  // all done
  return( col & 0xFFFFFF00);
}



// fill array with players' statistics (returns current number of players in game)
extern INDEX SetAllPlayersStats( INDEX iSortKey)
{
  // determine maximum number of players for this session
  INDEX iPlayers    = 0;
  INDEX iMaxPlayers = _penPlayer->GetMaxPlayers();
  CPlayer *penCurrent;
  // loop thru potentional players 
  for( INDEX i=0; i<iMaxPlayers; i++)
  { // ignore non-existent players
    penCurrent = (CPlayer*)&*_penPlayer->GetPlayerEntity(i);
    if( penCurrent==NULL) continue;
    // fill in player parameters
    _apenPlayers[iPlayers] = penCurrent;
    // advance to next real player
    iPlayers++;
  }
  // sort statistics by some key if needed
  switch( iSortKey) {
  case PSK_NAME:    qsort( _apenPlayers, iPlayers, sizeof(CPlayer*), qsort_CompareNames);   break;
  case PSK_SCORE:   qsort( _apenPlayers, iPlayers, sizeof(CPlayer*), qsort_CompareScores);  break;
  case PSK_HEALTH:  qsort( _apenPlayers, iPlayers, sizeof(CPlayer*), qsort_CompareHealth);  break;
  case PSK_MANA:    qsort( _apenPlayers, iPlayers, sizeof(CPlayer*), qsort_CompareManas);   break;
  case PSK_FRAGS:   qsort( _apenPlayers, iPlayers, sizeof(CPlayer*), qsort_CompareFrags);   break;
  case PSK_DEATHS:  qsort( _apenPlayers, iPlayers, sizeof(CPlayer*), qsort_CompareDeaths);  break;
  default:  break;  // invalid or NONE key specified so do nothing
  }
  // all done
  return iPlayers;
}



// ----------------------- drawing functions

// draw border with filter
static void HUD_DrawBorder( FLOAT fCenterX, FLOAT fCenterY, FLOAT fSizeX, FLOAT fSizeY, COLOR colTiles)
{
  // determine location
  const FLOAT fCenterI  = fCenterX*_pixDPWidth  / 640.0f;
  const FLOAT fCenterJ  = fCenterY*_pixDPHeight / (480.0f * _pDP->dp_fWideAdjustment);
  const FLOAT fSizeI    = _fScalingX*fSizeX;
  const FLOAT fSizeJ    = _fScalingX*fSizeY;
  const FLOAT fTileSize = 8*_fScalingX*_fCustomScaling;
  // determine exact positions
  const FLOAT fLeft  = fCenterI  - fSizeI/2 -1; 
  const FLOAT fRight = fCenterI  + fSizeI/2 +1; 
  const FLOAT fUp    = fCenterJ  - fSizeJ/2 -1; 
  const FLOAT fDown  = fCenterJ  + fSizeJ/2 +1;
  const FLOAT fLeftEnd  = fLeft  + fTileSize;
  const FLOAT fRightBeg = fRight - fTileSize; 
  const FLOAT fUpEnd    = fUp    + fTileSize; 
  const FLOAT fDownBeg  = fDown  - fTileSize; 
  // prepare texture                 
  colTiles |= _ulAlphaHUD;
  // put corners
  _pDP->InitTexture( &_toTile, TRUE); // clamping on!
  _pDP->AddTexture( fLeft, fUp,   fLeftEnd, fUpEnd,   colTiles);
  _pDP->AddTexture( fRight,fUp,   fRightBeg,fUpEnd,   colTiles);
  _pDP->AddTexture( fRight,fDown, fRightBeg,fDownBeg, colTiles);
  _pDP->AddTexture( fLeft, fDown, fLeftEnd, fDownBeg, colTiles);
  // put edges
  _pDP->AddTexture( fLeftEnd,fUp,    fRightBeg,fUpEnd,   0.4f,0.0f, 0.6f,1.0f, colTiles);
  _pDP->AddTexture( fLeftEnd,fDown,  fRightBeg,fDownBeg, 0.4f,0.0f, 0.6f,1.0f, colTiles);
  _pDP->AddTexture( fLeft,   fUpEnd, fLeftEnd, fDownBeg, 0.0f,0.4f, 1.0f,0.6f, colTiles);
  _pDP->AddTexture( fRight,  fUpEnd, fRightBeg,fDownBeg, 0.0f,0.4f, 1.0f,0.6f, colTiles);
  // put center
  _pDP->AddTexture( fLeftEnd, fUpEnd, fRightBeg, fDownBeg, 0.4f,0.4f, 0.6f,0.6f, colTiles);
  _pDP->FlushRenderingQueue();
}


// [Cecil] Icon scale
// draw icon texture (if color = NONE, use colortransitions structure)
static void HUD_DrawIcon(FLOAT fCenterX, FLOAT fCenterY, CTextureObject &toIcon,
                         COLOR colDefault, FLOAT fNormValue, BOOL bBlink, FLOAT fScale)
{
  // determine color
  COLOR col = colDefault;

  if (col == NONE) {
    col = GetCurrentColor(fNormValue);
  }

  // determine blinking state
  if (bBlink && fNormValue <= _cttHUD.ctt_fLowMedium / 2) {
    // activate blinking only if value is <= half the low edge
    INDEX iCurrentTime = (INDEX)(_tmNow*4);

    if (iCurrentTime & 1) {
      col = C_vdGRAY;
    }
  }

  // determine location
  const FLOAT fCenterI = fCenterX*_pixDPWidth  / 640.0f;
  const FLOAT fCenterJ = fCenterY*_pixDPHeight / (480.0f * _pDP->dp_fWideAdjustment);
  // determine dimensions
  CTextureData *ptd = (CTextureData*)toIcon.GetData();

  // [Cecil] Replaced texture size with constant size (16), added extra scaling
  const FLOAT fHalfSizeI = _fScalingX*_fCustomScaling * 16 * fScale;
  const FLOAT fHalfSizeJ = _fScalingX*_fCustomScaling * 16 * fScale;

  // done
  _pDP->InitTexture( &toIcon);
  _pDP->AddTexture( fCenterI-fHalfSizeI, fCenterJ-fHalfSizeJ,
                    fCenterI+fHalfSizeI, fCenterJ+fHalfSizeJ, col|_ulAlphaHUD);
  _pDP->FlushRenderingQueue();
}


// draw text (or numbers, whatever)
static void HUD_DrawText(FLOAT fCenterX, FLOAT fCenterY, const CTString &strText,
                         COLOR colDefault, FLOAT fNormValue) {
  // determine color
  COLOR col = colDefault;
  if (col == NONE) {
    col = GetCurrentColor(fNormValue);
  }

  // determine location
  PIX pixCenterI = (PIX)(fCenterX*_pixDPWidth  / 640.0f);
  PIX pixCenterJ = (PIX)(fCenterY*_pixDPHeight / (480.0f * _pDP->dp_fWideAdjustment));

  // done
  _pDP->SetTextScaling(_fScalingX*_fCustomScaling);
  _pDP->PutTextCXY(strText, pixCenterI, pixCenterJ, col|_ulAlphaHUD);
};

// draw bar
static void HUD_DrawBar( FLOAT fCenterX, FLOAT fCenterY, PIX pixSizeX, PIX pixSizeY,
                         enum BarOrientations eBarOrientation, COLOR colDefault, FLOAT fNormValue)
{
  // determine color
  COLOR col = colDefault;
  if( col==NONE) col = GetCurrentColor( fNormValue);
  // determine location and size
  PIX pixCenterI = (PIX)(fCenterX*_pixDPWidth  / 640.0f);
  PIX pixCenterJ = (PIX)(fCenterY*_pixDPHeight / (480.0f * _pDP->dp_fWideAdjustment));
  PIX pixSizeI   = (PIX)(_fScalingX*pixSizeX);
  PIX pixSizeJ   = (PIX)(_fScalingX*pixSizeY);
  // fill bar background area
  PIX pixLeft  = pixCenterI-pixSizeI/2;
  PIX pixUpper = pixCenterJ-pixSizeJ/2;
  // determine bar position and inner size
  switch( eBarOrientation) {
  case BO_UP:
    pixSizeJ *= fNormValue;
    break;
  case BO_DOWN:
    pixUpper  = pixUpper + (PIX)ceil(pixSizeJ * (1.0f-fNormValue));
    pixSizeJ *= fNormValue;
    break;
  case BO_LEFT:
    pixSizeI *= fNormValue;
    break;
  case BO_RIGHT:
    pixLeft   = pixLeft + (PIX)ceil(pixSizeI * (1.0f-fNormValue));
    pixSizeI *= fNormValue;
    break;
  }
  // done
  _pDP->Fill( pixLeft, pixUpper, pixSizeI, pixSizeJ, col|_ulAlphaHUD);
}

static void DrawRotatedQuad( class CTextureObject *_pTO, FLOAT fX, FLOAT fY, FLOAT fSize, ANGLE aAngle, COLOR col)
{
  FLOAT fSinA = Sin(aAngle);
  FLOAT fCosA = Cos(aAngle);
  FLOAT fSinPCos = fCosA*fSize+fSinA*fSize;
  FLOAT fSinMCos = fSinA*fSize-fCosA*fSize;
  FLOAT fI0, fJ0, fI1, fJ1, fI2, fJ2, fI3, fJ3;

  fI0 = fX-fSinPCos;  fJ0 = fY-fSinMCos;
  fI1 = fX+fSinMCos;  fJ1 = fY-fSinPCos;
  fI2 = fX+fSinPCos;  fJ2 = fY+fSinMCos;
  fI3 = fX-fSinMCos;  fJ3 = fY+fSinPCos;
  
  _pDP->InitTexture( _pTO);
  _pDP->AddTexture( fI0, fJ0, 0, 0, col,   fI1, fJ1, 0, 1, col,
                    fI2, fJ2, 1, 1, col,   fI3, fJ3, 1, 0, col);
  _pDP->FlushRenderingQueue();  

}

static void DrawAspectCorrectTextureCentered( class CTextureObject *_pTO, FLOAT fX, FLOAT fY, FLOAT fWidth, COLOR col)
{
  CTextureData *ptd = (CTextureData*)_pTO->GetData();
  FLOAT fTexSizeI = ptd->GetPixWidth();
  FLOAT fTexSizeJ = ptd->GetPixHeight();
  FLOAT fHeight = fWidth*fTexSizeJ/fTexSizeJ;
  
  _pDP->InitTexture( _pTO);
  _pDP->AddTexture( fX-fWidth*0.5f, fY-fHeight*0.5f, fX+fWidth*0.5f, fY+fHeight*0.5f, 0, 0, 1, 1, col);
  _pDP->FlushRenderingQueue();
}

// draw sniper mask
static void HUD_DrawSniperMask( void )
{
  // determine location
  const FLOAT fSizeI = _pixDPWidth;
  const FLOAT fSizeJ = _pixDPHeight;
  const FLOAT fCenterI = fSizeI/2;  
  const FLOAT fCenterJ = fSizeJ/2;  
  const FLOAT fBlackStrip = (fSizeI-fSizeJ)/2;

  COLOR colMask = C_WHITE|CT_OPAQUE;
  
  CTextureData *ptd = (CTextureData*)_toSniperMask.GetData();
  const FLOAT fTexSizeI = ptd->GetPixWidth();
  const FLOAT fTexSizeJ = ptd->GetPixHeight();

  // main sniper mask
  _pDP->InitTexture( &_toSniperMask);
  _pDP->AddTexture( fBlackStrip, 0, fCenterI, fCenterJ, 0.98f, 0.02f, 0, 1.0f, colMask);
  _pDP->AddTexture( fCenterI, 0, fSizeI-fBlackStrip, fCenterJ, 0, 0.02f, 0.98f, 1.0f, colMask);
  _pDP->AddTexture( fBlackStrip, fCenterJ, fCenterI, fSizeJ, 0.98f, 1.0f, 0, 0.02f, colMask);
  _pDP->AddTexture( fCenterI, fCenterJ, fSizeI-fBlackStrip, fSizeJ, 0, 1, 0.98f, 0.02f, colMask);
  _pDP->FlushRenderingQueue();
  _pDP->Fill( 0, 0, fBlackStrip+1, fSizeJ, C_BLACK|CT_OPAQUE);
  _pDP->Fill( fSizeI-fBlackStrip-1, 0, fBlackStrip+1, fSizeJ, C_BLACK|CT_OPAQUE);

  colMask = LerpColor(SE_COL_BLUE_LIGHT, C_WHITE, 0.25f);

  FLOAT fDistance = _penWeapons[0]->m_fRayHitDistance;
  FLOAT aFOV = Lerp(_penWeapons[0]->m_fSniperFOVlast, _penWeapons[0]->m_fSniperFOV, _pTimer->GetLerpFactor());

  CTString strTmp;
  
  // wheel
  FLOAT fZoom = 1.0f/tan(RadAngle(aFOV)*0.5f);  // 2.0 - 8.0
  
  FLOAT fAFact = (Clamp(aFOV, 14.2f, 53.1f)-14.2f)/(53.1f-14.2f); // only for zooms 2x-4x !!!!!!
  ANGLE aAngle = 314.0f+fAFact*292.0f;

  DrawRotatedQuad(&_toSniperWheel, fCenterI, fCenterJ, 40.0f*_fScalingY,
                  aAngle, colMask|0x44);
  
  FLOAT fTM = _pTimer->GetLerpedCurrentTick();
  
  COLOR colLED;
  if (_penWeapons[0]->m_tmLastSniperFire+1.25f<fTM) { // blinking
    colLED = 0x44FF22BB;
  } else {
    colLED = 0xFF4422DD;
  }

  // reload indicator
  DrawAspectCorrectTextureCentered(&_toSniperLed, fCenterI-37.0f*_fScalingY,
    fCenterJ+36.0f*_fScalingY, 15.0f*_fScalingY, colLED);
    
  if (_fScalingX >= 1.0f) {
    FLOAT _fIconSize;
    FLOAT _fLeftX,  _fLeftYU,  _fLeftYD;
    FLOAT _fRightX, _fRightYU, _fRightYD;

    if (_fScalingX <= 1.3f) {
      _pDP->SetFont(_pfdConsoleFont);
      _pDP->SetTextAspect( 1.0f);
      _pDP->SetTextScaling(1.0f);
      _fIconSize = 22.8f;
      _fLeftX = 159.0f;
      _fLeftYU = 8.0f;
      _fLeftYD = 6.0f;
      _fRightX = 159.0f;
      _fRightYU = 11.0f;
      _fRightYD = 6.0f;

    } else {
      _pDP->SetFont(_pfdDisplayFont);
      _pDP->SetTextAspect( 1.0f);
      _pDP->SetTextScaling(0.7f*_fScalingY);
      _fIconSize = 19.0f;
      _fLeftX = 162.0f;
      _fLeftYU = 8.0f;
      _fLeftYD = 6.0f;
      _fRightX = 162.0f;
      _fRightYU = 11.0f;
      _fRightYD = 6.0f;
    }
     
    // arrow + distance
    DrawAspectCorrectTextureCentered(&_toSniperArrow, fCenterI-_fLeftX*_fScalingY,
      fCenterJ-_fLeftYU*_fScalingY, _fIconSize*_fScalingY, 0xFFCC3399 );
    if (fDistance>9999.9f) { strTmp.PrintF("---.-");           }
    else if (TRUE)         { strTmp.PrintF("%.1f", fDistance); }
    _pDP->PutTextC( strTmp, fCenterI-_fLeftX*_fScalingY,
      fCenterJ+_fLeftYD*_fScalingY, colMask|0xaa);
    
    // eye + zoom level
    DrawAspectCorrectTextureCentered(&_toSniperEye,   fCenterI+_fRightX*_fScalingY,
      fCenterJ-_fRightYU*_fScalingY, _fIconSize*_fScalingY, 0xFFCC3399 ); //SE_COL_ORANGE_L
    strTmp.PrintF("%.1fx", fZoom);
    _pDP->PutTextC( strTmp, fCenterI+_fRightX*_fScalingY,
      fCenterJ+_fRightYD*_fScalingY, colMask|0xaa);
  }
}

//<<<<<<< DEBUG FUNCTIONS >>>>>>>

#ifdef ENTITY_DEBUG
CRationalEntity *DBG_prenStackOutputEntity = NULL;
#endif
void HUD_SetEntityForStackDisplay(CRationalEntity *pren)
{
#ifdef ENTITY_DEBUG
  DBG_prenStackOutputEntity = pren;
#endif
  return;
}

#ifdef ENTITY_DEBUG
static void HUD_DrawEntityStack()
{
  CTString strTemp;
  PIX pixFontHeight;
  ULONG pixTextBottom;

  if (tmp_ai[9]==12345)
  {
    if (DBG_prenStackOutputEntity!=NULL)
    {
      pixFontHeight = _pfdConsoleFont->fd_pixCharHeight;
      pixTextBottom = _pixDPHeight*0.83;
      _pDP->SetFont( _pfdConsoleFont);
      _pDP->SetTextScaling( 1.0f);
    
      INDEX ctStates = DBG_prenStackOutputEntity->en_stslStateStack.Count();
      strTemp.PrintF("-- stack of '%s'(%s)@%gs\n", DBG_prenStackOutputEntity->GetName(),
        DBG_prenStackOutputEntity->en_pecClass->ec_pdecDLLClass->dec_strName,
        _pTimer->CurrentTick());
      _pDP->PutText( strTemp, 1, pixTextBottom-pixFontHeight*(ctStates+1), _colHUD|_ulAlphaHUD);
      
      for(INDEX iState=ctStates-1; iState>=0; iState--) {
        SLONG slState = DBG_prenStackOutputEntity->en_stslStateStack[iState];
        strTemp.PrintF("0x%08x %s\n", slState, 
          DBG_prenStackOutputEntity->en_pecClass->ec_pdecDLLClass->HandlerNameForState(slState));
        _pDP->PutText( strTemp, 1, pixTextBottom-pixFontHeight*(iState+1), _colHUD|_ulAlphaHUD);
      }
    }
  }
}
#endif
//<<<<<<< DEBUG FUNCTIONS >>>>>>>

// main

// render interface (frontend) to drawport
// (units are in pixels for 640x480 resolution - for other res HUD will be scalled automatically)
extern void DrawHUD( const CPlayer *penPlayerCurrent, CDrawPort *pdpCurrent, BOOL bSnooping, const CPlayer *penPlayerOwner)
{
  // no player - no info, sorry
  if( penPlayerCurrent==NULL || (penPlayerCurrent->GetFlags()&ENF_DELETED)) return;
  
  // if snooping and owner player ins NULL, return
  if ( bSnooping && penPlayerOwner==NULL) return;

  // find last values in case of predictor
  CPlayer *penLast = (CPlayer*)penPlayerCurrent;
  if( penPlayerCurrent->IsPredictor()) penLast = (CPlayer*)(((CPlayer*)penPlayerCurrent)->GetPredicted());
  ASSERT( penLast!=NULL);
  if( penLast==NULL) return; // !!!! just in case

  // cache local variables
  hud_fOpacity = Clamp(hud_fOpacity, 0.1f, 1.0f);
  hud_fScaling = Clamp(hud_fScaling, 0.5f, 1.2f);
  
  // [Cecil] Player
  _penPlayer  = penPlayerCurrent;

  // [Cecil] Player's inventory
  _penInventory = (CPlayerInventory*)&*_penPlayer->m_penInventory;
  _penWeapons[0] = _penInventory->GetWeapon(0);
  _penWeapons[1] = _penInventory->GetWeapon(1);

  _pDP        = pdpCurrent;
  _pixDPWidth   = _pDP->GetWidth();
  _pixDPHeight  = _pDP->GetHeight();
  _fCustomScaling     = hud_fScaling;
  _fScalingX = (FLOAT)_pixDPWidth / 640.0f;
  _fScalingY = (FLOAT)_pixDPHeight / 480.0f;
  _colHUD     = 0x4C80BB00;
  _colHUDText = SE_COL_ORANGE_LIGHT;
  _ulAlphaHUD = NormFloatToByte(hud_fOpacity);
  _tmNow = _pTimer->CurrentTick();

  // determine hud colorization;
  COLOR colMax = SE_COL_BLUEGREEN_LT;
  COLOR colTop = SE_COL_ORANGE_LIGHT;
  COLOR colMid = LerpColor(colTop, C_RED, 0.5f);

  // adjust borders color in case of spying mode
  COLOR colBorder = _colHUD; 
  
  if( bSnooping) {
    colBorder = SE_COL_ORANGE_NEUTRAL;
    if( ((ULONG)(_tmNow*5))&1) {
      //colBorder = (colBorder>>1) & 0x7F7F7F00; // darken flash and scale
      colBorder = SE_COL_ORANGE_DARK;
      _fCustomScaling *= 0.933f;
    }
  }

  // draw sniper mask (original mask even if snooping)
  if (penPlayerOwner->GetWeapon(0)->m_iCurrentWeapon == WEAPON_SNIPER
   && penPlayerOwner->GetWeapon(0)->m_bSniping) {
    HUD_DrawSniperMask();
  }
   
  // prepare font and text dimensions
  CTString strValue;
  PIX pixCharWidth;
  FLOAT fValue, fNormValue, fCol, fRow;
  _pDP->SetFont( &_fdNumbersFont);
  pixCharWidth = _fdNumbersFont.GetWidth() + _fdNumbersFont.GetCharSpacing() +1;
  FLOAT fChrUnit = pixCharWidth * _fCustomScaling;

  const PIX pixTopBound    = 6;
  const PIX pixLeftBound   = 6;
  const PIX pixBottomBound = (480 * _pDP->dp_fWideAdjustment) -pixTopBound;
  const PIX pixRightBound  = 640-pixLeftBound;
  FLOAT fOneUnit  = (32+0) * _fCustomScaling;  // unit size
  FLOAT fAdvUnit  = (32+4) * _fCustomScaling;  // unit advancer
  FLOAT fNextUnit = (32+8) * _fCustomScaling;  // unit advancer
  FLOAT fHalfUnit = fOneUnit * 0.5f;
  FLOAT fMoverX, fMoverY;
  COLOR colDefault;

  // [Cecil] Set health and armor
  const FLOAT fTopHealth = GetSP()->sp_fStartHealth;
  const FLOAT fTopArmor  = GetSP()->sp_fMaxArmor * 0.5f;

  BOOL bEasy = (GetSP()->sp_gdGameDifficulty <= CSessionProperties::GD_EASY);
  const FLOAT fMaxHealth = GetSP()->sp_fMaxHealth * (bEasy ? 1.5f : 1.0f);
  const FLOAT fMaxArmor  = GetSP()->sp_fMaxArmor  * (bEasy ? 1.5f : 1.0f);
  
  // prepare and draw health info
  fValue = ClampDn(_penPlayer->GetHealth(), 0.0f);  // never show negative health
  fNormValue = fValue/fTopHealth;
  strValue.PrintF("%d", (SLONG)ceil(fValue));
  PrepareColorTransitions(colMax, colTop, colMid, C_RED, 0.5f, 0.25f, FALSE);

  // [Cecil] Adjust size based on max health or armor
  FLOAT fMaxHealthArmor = Max(fMaxHealth, fMaxArmor);
  FLOAT fWidth = Max(FLOAT(Floor(log10(fMaxHealthArmor)+1.0f)), 3.0f);

  fRow = pixBottomBound-fHalfUnit;
  fCol = pixLeftBound+fHalfUnit;

  colDefault = AddShaker(5, fValue, penLast->m_iLastHealth, penLast->m_tmHealthChanged, fMoverX, fMoverY);
  HUD_DrawBorder(fCol+fMoverX, fRow+fMoverY, fOneUnit, fOneUnit, colBorder);

  fCol += fAdvUnit+fChrUnit*(fWidth/2.0f) -fHalfUnit;
  HUD_DrawBorder( fCol, fRow, fChrUnit*fWidth, fOneUnit, colBorder);
  HUD_DrawText(fCol, fRow, strValue, colDefault, fNormValue);

  fCol -= fAdvUnit+fChrUnit*(fWidth/2.0f) -fHalfUnit;
  HUD_DrawIcon(fCol+fMoverX, fRow+fMoverY, _toHealth, C_WHITE, fNormValue, TRUE, 1.0f);

  // prepare and draw armor info (eventually)
  fValue = _penPlayer->m_fArmor;

  if (fValue > 0.0f) {
    fNormValue = fValue/fTopArmor;
    strValue.PrintF("%d", (SLONG)ceil(fValue));
    PrepareColorTransitions(colMax, colTop, colMid, C_lGRAY, 0.5f, 0.25f, FALSE);

    fRow = pixBottomBound - (fNextUnit+fHalfUnit);
    fCol = pixLeftBound + fHalfUnit;

    colDefault = AddShaker(3, fValue, penLast->m_iLastArmor, penLast->m_tmArmorChanged, fMoverX, fMoverY);
    HUD_DrawBorder( fCol+fMoverX, fRow+fMoverY, fOneUnit, fOneUnit, colBorder);

    fCol += fAdvUnit+fChrUnit*(fWidth/2.0f) -fHalfUnit;
    HUD_DrawBorder( fCol, fRow, fChrUnit*fWidth, fOneUnit, colBorder);
    HUD_DrawText( fCol, fRow, strValue, NONE, fNormValue);

    // [Cecil] Armor multiplier
    FLOAT fArmorMul = GetSP()->sp_fMaxArmor / 200.0f;

    fCol -= fAdvUnit+fChrUnit*(fWidth/2.0f) -fHalfUnit;
    if (fValue <= 50.5f * fArmorMul) {
      HUD_DrawIcon(fCol+fMoverX, fRow+fMoverY, _toArmorSmall, C_WHITE, fNormValue, FALSE, 1.0f);
    } else if (fValue <= 100.5f * fArmorMul) {
      HUD_DrawIcon(fCol+fMoverX, fRow+fMoverY, _toArmorMedium, C_WHITE, fNormValue, FALSE, 1.0f);
    } else {
      HUD_DrawIcon(fCol+fMoverX, fRow+fMoverY, _toArmorLarge, C_WHITE, fNormValue, FALSE, 1.0f);
    }
  }

  // prepare and draw ammo and weapon info
  CTextureObject *ptoWantedWeapon = NULL;

  // [Cecil] Player's weapons
  INDEX aiCurrentWeapon[2] = {
    _penWeapons[0]->GetCurrent(), _penWeapons[1]->GetCurrent(),
  };

  INDEX aiWantedWeapon[2] = {
    _penWeapons[0]->GetWanted(), _penWeapons[1]->GetWanted(),
  };

  CWeaponArsenal &aWeapons = _penInventory->PredTail()->m_aWeapons;
  CAmmunition &aAmmo = _penInventory->PredTail()->m_aAmmo;

  // [Cecil] Reset weapons on ammunition
  for (INDEX iResetAmmo = 0; iResetAmmo < aAmmo.Count(); iResetAmmo++) {
    aAmmo[iResetAmmo].bWeapon = FALSE;
  }

  // [Cecil] Check if any weapons for certain ammo type
  for (INDEX iCheckWeapon = WEAPON_KNIFE; iCheckWeapon < WEAPON_LAST; iCheckWeapon++) {
    if (!WeaponExists(_penWeapons[0]->m_iAvailableWeapons, iCheckWeapon)) {
      continue;
    }

    SPlayerAmmo *ppaAmmo = aWeapons[iCheckWeapon].ppaAmmo;
    SPlayerAmmo *ppaAlt = aWeapons[iCheckWeapon].ppaAlt;

    // have weapons for this ammo type
    if (ppaAmmo != NULL) {
      ppaAmmo->bWeapon = TRUE;
    }
    if (ppaAlt != NULL) {
      ppaAlt->bWeapon = TRUE;
    }
  }

  // determine corresponding ammo and weapon texture component
  ptoWantedWeapon = aWeapons[aiWantedWeapon[0]].pwsWeapon->ptoIcon;

  // [Cecil] New system
  SPlayerWeapon &pwCurrent1 = aWeapons[aiCurrentWeapon[0]];
  SPlayerWeapon &pwCurrent2 = aWeapons[aiCurrentWeapon[1]];

  SWeaponAmmo *pwaAmmo1 = pwCurrent1.GetAmmo();
  SWeaponAmmo *pwaAmmo2 = pwCurrent2.GetAmmo();

  SWeaponAmmo *pwaAltAmmo1 = pwCurrent1.GetAlt();
  SWeaponAmmo *pwaAltAmmo2 = pwCurrent2.GetAlt();

  // 0 or 1
  INDEX iShowAltAmmo = (pwaAmmo1 != pwaAltAmmo1);
  
  CTextureObject *ptoAmmo = NULL;
  FLOAT fAmmo = 0.0f;
  FLOAT fMaxAmmo = 1.0f;
  BOOL abMag[2] = { FALSE, FALSE };

  CTextureObject *ptoAltAmmo = NULL;
  FLOAT fAltAmmo = 0.0f;
  FLOAT fAltMaxAmmo = 1.0f;

  // [Cecil] Ammo available
  if (pwaAmmo1 != NULL) {
    ptoAmmo = pwaAmmo1->ptoIcon;

    // display magazine
    INDEX iMaxMag = pwCurrent1.pwsWeapon->iMaxMag;

    if (iMaxMag > 0) {
      fAmmo = pwCurrent1.aiMag[0];
      fMaxAmmo = iMaxMag;
      abMag[0] = TRUE;

    // display ammo
    } else {
      fAmmo = pwCurrent1.CurrentAmmo();
      fMaxAmmo = pwaAmmo1->iMaxAmount;
    }
  }

  // [Cecil] Extra weapon ammo if it exists and not the same (unless it's a mag)
  if (_penWeapons[1]->GetCurrent() != WEAPON_NONE && pwaAmmo2 != NULL && (pwaAmmo1 != pwaAmmo2 || abMag[0])) {
    ptoAltAmmo = pwaAmmo2->ptoIcon;

    // display magazine
    INDEX iMaxMag = pwCurrent2.pwsWeapon->iMaxMag;

    if (iMaxMag > 0) {
      fAltAmmo = pwCurrent2.aiMag[1];
      fAltMaxAmmo = iMaxMag;
      abMag[1] = TRUE;

      iShowAltAmmo = 2;

    // display ammo
    } else {
      fAltAmmo = pwCurrent2.CurrentAmmo();
      fAltMaxAmmo = pwaAmmo2->iMaxAmount;

      // 0 or 2
      iShowAltAmmo = (pwaAmmo1 != pwaAmmo2) * 2;
    }
  
  // [Cecil] Alt ammo available
  } else if (_penInventory->AltFireExists(aiCurrentWeapon[0]) && pwaAltAmmo1 != NULL) {
    ptoAltAmmo = pwaAltAmmo1->ptoIcon;
    fAltAmmo = pwCurrent1.CurrentAlt();
    fAltMaxAmmo = pwaAltAmmo1->iMaxAmount;
  }

  // [Cecil] Adjust size based on max ammo
  FLOAT fMaxAmmoAltNormal = Max(fMaxAmmo, fAltMaxAmmo);
  fWidth = Max(FLOAT(Floor(log10(fMaxAmmoAltNormal)+1.0f)), 3.0f);

  // [Cecil] Draw ammo or magazine count
  if ((!GetSP()->sp_bInfiniteAmmo || abMag[0]) && ptoAmmo != NULL) {
    // determine ammo quantities
    fNormValue = fAmmo / fMaxAmmo;
    strValue.PrintF("%d", (SLONG)ceil(fAmmo));
    PrepareColorTransitions(colMax, colTop, colMid, C_RED, 0.30f, 0.15f, FALSE);

    // draw ammo, value and weapon
    fRow = pixBottomBound-fHalfUnit;
    fCol = 320.0f - fAdvUnit - fChrUnit*(fWidth/2.0f) - fHalfUnit;
    
    HUD_DrawBorder(fCol, fRow, fOneUnit, fOneUnit, colBorder);
    HUD_DrawIcon(fCol, fRow, *ptoAmmo, C_WHITE, fNormValue, TRUE, 1.0f);

    fCol += fAdvUnit+fChrUnit*(fWidth/2.0f) - fHalfUnit;
    HUD_DrawBorder(fCol, fRow, fChrUnit * fWidth, fOneUnit, colBorder);
    HUD_DrawText(fCol, fRow, strValue, NONE, fNormValue);
  }

  // [Cecil] Draw alt ammo
  if ((!GetSP()->sp_bInfiniteAmmo || abMag[1]) && ptoAltAmmo != NULL && iShowAltAmmo > 0) {
    // determine ammo quantities
    fNormValue = fAltAmmo / fAltMaxAmmo;
    strValue.PrintF("%d", (SLONG)ceil(fAltAmmo));
    PrepareColorTransitions(colMax, colTop, colMid, C_RED, 0.30f, 0.15f, FALSE);

    // draw ammo, value and weapon
    fRow = pixBottomBound-fHalfUnit - fNextUnit;
    fCol = 320.0f - fAdvUnit - fChrUnit*(fWidth/2.0f) - fHalfUnit;
    
    HUD_DrawBorder(fCol, fRow, fOneUnit, fOneUnit, colBorder);
    HUD_DrawIcon(fCol, fRow, *ptoAltAmmo, C_WHITE, fNormValue, (iShowAltAmmo == 2), 1.0f);

    fCol += fAdvUnit+fChrUnit*(fWidth/2.0f) - fHalfUnit;
    HUD_DrawBorder(fCol, fRow, fChrUnit * fWidth, fOneUnit, colBorder);
    HUD_DrawText(fCol, fRow, strValue, NONE, fNormValue);
  }

  // display all ammo infos
  INDEX i;
  FLOAT fAdv;
  COLOR colIcon, colBar;
  PrepareColorTransitions(colMax, colTop, colMid, C_RED, 0.5f, 0.25f, FALSE);
  // reduce the size of icon slightly
  _fCustomScaling = ClampDn( _fCustomScaling*0.8f, 0.5f);
  const FLOAT fOneUnitS  = fOneUnit  *0.8f;
  const FLOAT fAdvUnitS  = fAdvUnit  *0.8f;
  const FLOAT fNextUnitS = fNextUnit *0.8f;
  const FLOAT fHalfUnitS = fHalfUnit *0.8f;

  // prepare postition and ammo quantities
  fRow = pixBottomBound-fHalfUnitS;
  fCol = pixRightBound -fHalfUnitS;
  const FLOAT fBarPos = fHalfUnitS*0.7f;

  FLOAT fBombCount = penPlayerCurrent->m_iSeriousBombCount;
  BOOL  bBombFiring = FALSE;

  // draw serious bomb
  #define BOMB_FIRE_TIME 1.5f

  if (penPlayerCurrent->m_tmSeriousBombFired + BOMB_FIRE_TIME > _pTimer->GetLerpedCurrentTick()) {
    fBombCount = ClampUp(fBombCount + 1.0f, 3.0f);
    bBombFiring = TRUE;
  }

  if (fBombCount > 0) {
    fNormValue = (FLOAT) fBombCount / 3.0f;
    COLOR colBombBorder = _colHUD;
    COLOR colBombIcon = C_WHITE;
    COLOR colBombBar = _colHUDText;

    if (fBombCount == 1) {
      colBombBar = C_RED;
    }

    if (bBombFiring) { 
      FLOAT fFactor = (_pTimer->GetLerpedCurrentTick() - penPlayerCurrent->m_tmSeriousBombFired) / BOMB_FIRE_TIME;
      colBombBorder = LerpColor(colBombBorder, C_RED, fFactor);
      colBombIcon = LerpColor(colBombIcon, C_RED, fFactor);
      colBombBar = LerpColor(colBombBar, C_RED, fFactor);
    }

    HUD_DrawBorder( fCol,         fRow, fOneUnitS, fOneUnitS, colBombBorder);
    HUD_DrawIcon(   fCol,         fRow, _toASeriousBomb, colBombIcon, fNormValue, FALSE, 1.0f);
    HUD_DrawBar(    fCol+fBarPos, fRow, fOneUnitS/5, fOneUnitS-2, BO_DOWN, colBombBar, fNormValue);
    // make space for serious bomb
    fCol -= fAdvUnitS;
  }

  // loop thru all ammo types
  if (!GetSP()->sp_bInfiniteAmmo) {
    for (INDEX iAmmo = aAmmo.Count()-1; iAmmo >= 0; iAmmo--) {
      SPlayerAmmo &pa = aAmmo[iAmmo];

      // [Cecil] Don't display
      if (!pa.pwaAmmoStruct->bDisplay) {
        continue;
      }

      // [Cecil] No weapons for ammo and no ammo
      if (pa.iAmount == 0 && !pa.bWeapon) {
        continue;
      }

      // display ammo info
      colIcon = (pa.iAmount == 0) ? C_mdGRAY : C_WHITE;

      CTextureObject *ptoDrawIcon = pa.pwaAmmoStruct->ptoIcon;

      // [Cecil] This icon matches the current ammo/alt icon
      if (ptoDrawIcon != NULL && (ptoAmmo == ptoDrawIcon || ptoAltAmmo == ptoDrawIcon)) {
        colIcon = C_WHITE;
      }
       
      fNormValue = (FLOAT)pa.iAmount / pa.Max();
      colBar = AddShaker(4, pa.iAmount, pa.iLastAmount, pa.tmChanged, fMoverX, fMoverY);

      HUD_DrawBorder(fCol, fRow+fMoverY, fOneUnitS, fOneUnitS, colBorder);

      if (ptoDrawIcon != NULL) {
        HUD_DrawIcon(fCol, fRow+fMoverY, *ptoDrawIcon, colIcon, fNormValue, FALSE, 1.0f);
      }

      HUD_DrawBar(fCol+fBarPos, fRow+fMoverY, fOneUnitS/5, fOneUnitS-2, BO_DOWN, colBar, fNormValue);

      // advance to next position
      fCol -= fAdvUnitS;  
    }
  }

  // draw powerup(s) if needed
  PrepareColorTransitions(colMax, colTop, colMid, C_RED, 0.66f, 0.33f, FALSE);
  fRow = pixBottomBound-fOneUnitS-fAdvUnitS;
  fCol = pixRightBound -fHalfUnitS;

  for (i = 0; i < MAX_POWERUPS; i++) {
    // skip if not active
    const TIME tmDelta = _penInventory->GetPowerupRemaining(i);

    if (tmDelta <= 0.0f) {
      continue;
    }

    // [Cecil] Power Up Time Multiplier
    fNormValue = tmDelta / (_penInventory->GetPowerupMaxTime(i) * GetSP()->sp_fPowerupTimeMul);

    // draw icon and a little bar
    HUD_DrawBorder( fCol,         fRow, fOneUnitS, fOneUnitS, colBorder);
    HUD_DrawIcon(   fCol,         fRow, _atoPowerups[i], C_WHITE, fNormValue, TRUE, 1.0f);
    HUD_DrawBar(    fCol+fBarPos, fRow, fOneUnitS/5, fOneUnitS-2, BO_DOWN, NONE, fNormValue);
    
    // [Cecil] Power Up Time Multiplier
    // play sound if icon is flashing
    if (fNormValue <= (_cttHUD.ctt_fLowMedium / 2) / GetSP()->sp_fPowerupTimeMul) {
      // activate blinking only if value is <= half the low edge
      INDEX iLastTime = (INDEX)(_tmLast*4);
      INDEX iCurrentTime = (INDEX)(_tmNow*4);
      if(iCurrentTime&1 & !(iLastTime&1)) {
        ((CPlayer *)penPlayerCurrent)->PlayPowerUpSound();
      }
    }
    // advance to next position
    fCol -= fAdvUnitS;
  }

  // if weapon change is in progress
  _fCustomScaling = hud_fScaling;
  hud_tmWeaponsOnScreen = Clamp( hud_tmWeaponsOnScreen, 0.0f, 10.0f);   

  if (_tmNow - _penWeapons[0]->m_tmWeaponChangeRequired < hud_tmWeaponsOnScreen) {
    // determine number of weapons that player has
    INDEX ctWeapons = 0;
    
    // [Cecil] Count existing weapons
    for (INDEX iCount = WEAPON_NONE+1; iCount < WEAPON_LAST; iCount++) {
      if (WeaponExists(_penWeapons[0]->m_iAvailableWeapons, iCount)) {
        ctWeapons++;
      }
    }

    // display all available weapons
    fRow = pixBottomBound - fHalfUnit - 3*fNextUnit;
    fCol = 320.0f - (ctWeapons*fAdvUnit-fHalfUnit)/2.0f;

    for (INDEX iWeapon = WEAPON_NONE+1; iWeapon < WEAPON_LAST; iWeapon++) {
      SPlayerWeapon &pw = aWeapons[iWeapon];

      // [Cecil] Skip unexistent weapons
      if (!WeaponExists(_penWeapons[0]->m_iAvailableWeapons, iWeapon)) {
        continue;
      }

      // display weapon icon
      COLOR colBorder = _colHUD;
      colIcon = 0xccddff00;

      // [Cecil] Highlight wanted weapon
      if (aiWantedWeapon[0] == iWeapon && aiWantedWeapon[1] == iWeapon) {
        colIcon = 0xFFCCFF00;
        colBorder = 0xFFCCFF00;
        
      // [Cecil] Extra weapon
      } else if (aiWantedWeapon[1] == iWeapon) {
        colIcon = 0x00CCFF00;
        colBorder = 0x00CCFF00;
        
      // [Cecil] Main weapon
      } else if (aiWantedWeapon[0] == iWeapon) {
        colIcon = 0xFFCC0000;
        colBorder = 0xFFCC0000;
      }

      CTextureObject *ptoDrawIcon = pw.pwsWeapon->ptoIcon;

      // no ammo
      if (!pw.HasAmmo(_penInventory->AltFireExists(iWeapon))) {
        HUD_DrawBorder(fCol, fRow, fOneUnit, fOneUnit, 0x22334400);
        HUD_DrawIcon(fCol, fRow, *ptoDrawIcon, 0x22334400, 1.0f, FALSE, 1.0f);

      // has ammo
      } else {
        HUD_DrawBorder(fCol, fRow, fOneUnit, fOneUnit, colBorder);
        HUD_DrawIcon(fCol, fRow, *ptoDrawIcon, colIcon, 1.0f, FALSE, 1.0f);
      }

      // advance to next position
      fCol += fAdvUnit;
    }
  }

  // reduce icon sizes a bit
  const FLOAT fUpperSize = ClampDn(_fCustomScaling*0.5f, 0.5f)/_fCustomScaling;
  _fCustomScaling*=fUpperSize;
  ASSERT( _fCustomScaling>=0.5f);
  fChrUnit  *= fUpperSize;
  fOneUnit  *= fUpperSize;
  fHalfUnit *= fUpperSize;
  fAdvUnit  *= fUpperSize;
  fNextUnit *= fUpperSize;

  // draw oxygen info if needed
  BOOL bOxygenOnScreen = FALSE;
  fValue = _penPlayer->en_tmMaxHoldBreath - (_pTimer->CurrentTick() - _penPlayer->en_tmLastBreathed);
  if (_penPlayer->IsConnected() && IsAlive(_penPlayer) && fValue<30.0f) { 
    // prepare and draw oxygen info
    fRow = pixTopBound + fOneUnit + fNextUnit;
    fCol = 280.0f;
    fAdv = fAdvUnit + fOneUnit*4/2 - fHalfUnit;
    PrepareColorTransitions( colMax, colTop, colMid, C_RED, 0.5f, 0.25f, FALSE);
    fNormValue = fValue/30.0f;
    fNormValue = ClampDn(fNormValue, 0.0f);
    HUD_DrawBorder( fCol,      fRow, fOneUnit,         fOneUnit, colBorder);
    HUD_DrawBorder( fCol+fAdv, fRow, fOneUnit*4,       fOneUnit, colBorder);
    HUD_DrawBar(    fCol+fAdv, fRow, fOneUnit*4*0.975, fOneUnit*0.9375, BO_LEFT, NONE, fNormValue);
    HUD_DrawIcon(   fCol,      fRow, _toOxygen, C_WHITE, fNormValue, TRUE, 1.0f);
    bOxygenOnScreen = TRUE;
  }

  // draw boss energy if needed
  if (_penPlayer->m_penMainMusicHolder != NULL) {
    CMusicHolder &mh = (CMusicHolder&)*_penPlayer->m_penMainMusicHolder;
    fNormValue = 0;

    if (mh.m_penBoss != NULL && IsAlive(mh.m_penBoss)) {
      CEnemyBase &eb = (CEnemyBase&)*mh.m_penBoss;
      ASSERT( eb.m_fMaxHealth>0);
      fValue = eb.GetHealth();
      fNormValue = fValue/eb.m_fMaxHealth;
    }
    if( mh.m_penCounter!=NULL) {
      CEnemyCounter &ec = (CEnemyCounter&)*mh.m_penCounter;
      if (ec.m_iCount>0) {
        fValue = ec.m_iCount;
        fNormValue = fValue/ec.m_iCountFrom;
      }
    }
    if( fNormValue>0) {
      // prepare and draw boss energy info
      //PrepareColorTransitions( colMax, colTop, colMid, C_RED, 0.5f, 0.25f, FALSE);
      PrepareColorTransitions( colMax, colMax, colTop, C_RED, 0.5f, 0.25f, FALSE);
      
      fRow = pixTopBound + fOneUnit + fNextUnit;
      fCol = 184.0f;
      fAdv = fAdvUnit+ fOneUnit*16/2 -fHalfUnit;
      if( bOxygenOnScreen) fRow += fNextUnit;
      HUD_DrawBorder( fCol,      fRow, fOneUnit,          fOneUnit, colBorder);
      HUD_DrawBorder( fCol+fAdv, fRow, fOneUnit*16,       fOneUnit, colBorder);
      HUD_DrawBar(    fCol+fAdv, fRow, fOneUnit*16*0.995, fOneUnit*0.9375, BO_LEFT, NONE, fNormValue);
      HUD_DrawIcon(   fCol,      fRow, _toHealth, C_WHITE, fNormValue, FALSE, 1.0f);
    }
  }

  // determine scaling of normal text and play mode
  const FLOAT fTextScale  = (_fScalingX+1.0f) * 0.5f;
  const BOOL bSinglePlay  =  GetSP()->sp_bSinglePlayer;
  const BOOL bCooperative =  GetSP()->sp_bCooperative && !bSinglePlay;
  const BOOL bScoreMatch  = !GetSP()->sp_bCooperative && !GetSP()->sp_bUseFrags;
  const BOOL bFragMatch   = !GetSP()->sp_bCooperative &&  GetSP()->sp_bUseFrags;
  COLOR colMana, colFrags, colDeaths, colHealth, colArmor;
  COLOR colScore  = _colHUD;
  INDEX iScoreSum = 0;

  // if not in single player mode, we'll have to calc (and maybe printout) other players' info
  if (!bSinglePlay) {
    // set font and prepare font parameters
    _pfdDisplayFont->SetVariableWidth();
    _pDP->SetFont( _pfdDisplayFont);
    _pDP->SetTextScaling( fTextScale);
    FLOAT fCharHeight = (_pfdDisplayFont->GetHeight()-2)*fTextScale;
    // generate and sort by mana list of active players
    BOOL bMaxScore=TRUE, bMaxMana=TRUE, bMaxFrags=TRUE, bMaxDeaths=TRUE;
    hud_iSortPlayers = Clamp( hud_iSortPlayers, -1L, 6L);
    SortKeys eKey = (SortKeys)hud_iSortPlayers;
    if (hud_iSortPlayers==-1) {
           if (bCooperative) eKey = PSK_HEALTH;
      else if (bScoreMatch)  eKey = PSK_SCORE;
      else if (bFragMatch)   eKey = PSK_FRAGS;
      else { ASSERT(FALSE);  eKey = PSK_NAME; }
    }
    if( bCooperative) eKey = (SortKeys)Clamp( (INDEX)eKey, 0L, 3L);
    if( eKey==PSK_HEALTH && (bScoreMatch || bFragMatch)) { eKey = PSK_NAME; }; // prevent health snooping in deathmatch
    INDEX iPlayers = SetAllPlayersStats(eKey);
    // loop thru players 
    for( INDEX i=0; i<iPlayers; i++)
    { // get player name and mana
      CPlayer *penPlayer = _apenPlayers[i];
      const CTString strName = penPlayer->GetPlayerName();
      const INDEX iScore  = penPlayer->m_psGameStats.ps_iScore;
      const INDEX iMana   = penPlayer->m_iMana;
      const INDEX iFrags  = penPlayer->m_psGameStats.ps_iKills;
      const INDEX iDeaths = penPlayer->m_psGameStats.ps_iDeaths;
      const INDEX iHealth = ClampDn( (INDEX)ceil( penPlayer->GetHealth()), 0L);
      const INDEX iArmor  = ClampDn( (INDEX)ceil( penPlayer->m_fArmor),    0L);
      CTString strScore, strMana, strFrags, strDeaths, strHealth, strArmor;
      strScore.PrintF(  "%d", iScore);
      strMana.PrintF(   "%d", iMana);
      strFrags.PrintF(  "%d", iFrags);
      strDeaths.PrintF( "%d", iDeaths);
      strHealth.PrintF( "%d", iHealth);
      strArmor.PrintF(  "%d", iArmor);
      // detemine corresponding colors
      colHealth = C_mlRED;
      colMana = colScore = colFrags = colDeaths = colArmor = C_lGRAY;
      if( iMana   > _penPlayer->m_iMana)                      { bMaxMana   = FALSE; colMana   = C_WHITE; }
      if( iScore  > _penPlayer->m_psGameStats.ps_iScore)      { bMaxScore  = FALSE; colScore  = C_WHITE; }
      if( iFrags  > _penPlayer->m_psGameStats.ps_iKills)      { bMaxFrags  = FALSE; colFrags  = C_WHITE; }
      if( iDeaths > _penPlayer->m_psGameStats.ps_iDeaths)     { bMaxDeaths = FALSE; colDeaths = C_WHITE; }
      if( penPlayer==_penPlayer) colScore = colMana = colFrags = colDeaths = _colHUD; // current player
      if( iHealth>25) colHealth = _colHUD;
      if( iArmor >25) colArmor  = _colHUD;
      // eventually print it out
      if( hud_iShowPlayers==1 || hud_iShowPlayers==-1 && !bSinglePlay) {
        // printout location and info aren't the same for deathmatch and coop play
        const FLOAT fCharWidth = (PIX)((_pfdDisplayFont->GetWidth()-2) *fTextScale);

        // [Cecil] fOneUnit multiplier 2 -> 4; removed colon
        if( bCooperative) { 
          _pDP->PutTextR(strName,   _pixDPWidth-12*fCharWidth, fCharHeight*i+fOneUnit*4, colScore |_ulAlphaHUD);
          _pDP->PutText("/",        _pixDPWidth- 6*fCharWidth, fCharHeight*i+fOneUnit*4, _colHUD  |_ulAlphaHUD);
          _pDP->PutTextC(strHealth, _pixDPWidth- 9*fCharWidth, fCharHeight*i+fOneUnit*4, colHealth|_ulAlphaHUD);
          _pDP->PutTextC(strArmor,  _pixDPWidth- 3*fCharWidth, fCharHeight*i+fOneUnit*4, colArmor |_ulAlphaHUD);
        } else if( bScoreMatch) { 
          _pDP->PutTextR(strName,  _pixDPWidth-12*fCharWidth, fCharHeight*i+fOneUnit*4, _colHUD |_ulAlphaHUD);
          _pDP->PutText("/",       _pixDPWidth- 6*fCharWidth, fCharHeight*i+fOneUnit*4, _colHUD |_ulAlphaHUD);
          _pDP->PutTextC(strScore, _pixDPWidth- 9*fCharWidth, fCharHeight*i+fOneUnit*4, colScore|_ulAlphaHUD);
          _pDP->PutTextC(strMana,  _pixDPWidth- 3*fCharWidth, fCharHeight*i+fOneUnit*4, colMana |_ulAlphaHUD);
        } else { // fragmatch!
          _pDP->PutTextR(strName,   _pixDPWidth-8*fCharWidth, fCharHeight*i+fOneUnit*4, _colHUD  |_ulAlphaHUD);
          _pDP->PutText("/",        _pixDPWidth-4*fCharWidth, fCharHeight*i+fOneUnit*4, _colHUD  |_ulAlphaHUD);
          _pDP->PutTextC(strFrags,  _pixDPWidth-6*fCharWidth, fCharHeight*i+fOneUnit*4, colFrags |_ulAlphaHUD);
          _pDP->PutTextC(strDeaths, _pixDPWidth-2*fCharWidth, fCharHeight*i+fOneUnit*4, colDeaths|_ulAlphaHUD);
        }
      }
      // calculate summ of scores (for coop mode)
      iScoreSum += iScore;  
    }
    // draw remaining time if time based death- or scorematch
    if ((bScoreMatch || bFragMatch) && hud_bShowMatchInfo){
      CTString strLimitsInfo="";  
      if (GetSP()->sp_iTimeLimit>0) {
        FLOAT fTimeLeft = ClampDn(GetSP()->sp_iTimeLimit*60.0f - _pNetwork->GetGameTime(), 0.0f);
        strLimitsInfo.PrintF("%s^cFFFFFF%s: %s\n", strLimitsInfo, TRANS("TIME LEFT"), TimeToString(fTimeLeft));
      }
      extern INDEX SetAllPlayersStats( INDEX iSortKey);
      // fill players table
      const INDEX ctPlayers = SetAllPlayersStats(bFragMatch?5:3); // sort by frags or by score
      // find maximum frags/score that one player has
      INDEX iMaxFrags = LowerLimit(INDEX(0));
      INDEX iMaxScore = LowerLimit(INDEX(0));
      {for(INDEX iPlayer=0; iPlayer<ctPlayers; iPlayer++) {
        CPlayer *penPlayer = _apenPlayers[iPlayer];
        iMaxFrags = Max(iMaxFrags, penPlayer->m_psLevelStats.ps_iKills);
        iMaxScore = Max(iMaxScore, penPlayer->m_psLevelStats.ps_iScore);
      }}
      if (GetSP()->sp_iFragLimit>0) {
        INDEX iFragsLeft = ClampDn(GetSP()->sp_iFragLimit-iMaxFrags, INDEX(0));
        strLimitsInfo.PrintF("%s^cFFFFFF%s: %d\n", strLimitsInfo, TRANS("FRAGS LEFT"), iFragsLeft);
      }
      if (GetSP()->sp_iScoreLimit>0) {
        INDEX iScoreLeft = ClampDn(GetSP()->sp_iScoreLimit-iMaxScore, INDEX(0));
        strLimitsInfo.PrintF("%s^cFFFFFF%s: %d\n", strLimitsInfo, TRANS("SCORE LEFT"), iScoreLeft);
      }
      _pfdDisplayFont->SetFixedWidth();
      _pDP->SetFont( _pfdDisplayFont);
      _pDP->SetTextScaling( fTextScale*0.8f );
      _pDP->SetTextCharSpacing( -2.0f*fTextScale);

      // [Cecil] Y coordinate: 48 -> 96
      _pDP->PutText(strLimitsInfo, 5.0f*_pixDPWidth/640.0f, 96.0f*_pixDPWidth/640.0f, C_WHITE|CT_OPAQUE);
    }

    // prepare color for local player printouts
    bMaxScore  ? colScore  = C_WHITE : colScore  = C_lGRAY;
    bMaxMana   ? colMana   = C_WHITE : colMana   = C_lGRAY;
    bMaxFrags  ? colFrags  = C_WHITE : colFrags  = C_lGRAY;
    bMaxDeaths ? colDeaths = C_WHITE : colDeaths = C_lGRAY;
  }

  // printout player latency if needed
  if (hud_bShowLatency) {
    _pfdDisplayFont->SetFixedWidth();
    _pDP->SetFont(_pfdDisplayFont);
    _pDP->SetTextScaling(fTextScale);
    _pDP->SetTextCharSpacing(-2.0f * fTextScale);

    CTString strLatency;
    strLatency.PrintF( "%4.0fms", _penPlayer->m_tmLatency*1000.0f);
    PIX pixFontHeight = (PIX)(_pfdDisplayFont->GetHeight() *fTextScale +fTextScale+1);
    _pDP->PutTextR(strLatency, _pixDPWidth, _pixDPHeight-pixFontHeight, C_WHITE|CT_OPAQUE);
  }

  // [Cecil] Voice commands menu
  if (ctl_bVoiceCommands) {
    FLOAT fCommandsScale = _fScalingY*0.85f;

    _pfdDisplayFont->SetVariableWidth();
    _pDP->SetFont(_pfdDisplayFont);
    _pDP->SetTextScaling(fTextScale);
    _pDP->SetTextCharSpacing(fTextScale);

    const INDEX ctCommands = 5;
    const CTString astrCommands[ctCommands] = {
      "None", "Cheers", "Dare", "Domination", "Help",
    };

    const FLOAT fHeight = 24.0f;
    const FLOAT fCenter = 240.0f - (fHeight*ctCommands) / 2.0f;

    for (INDEX iVC = 0; iVC < ctCommands; iVC++) {
      _pDP->Fill(8 * _fScalingY, (fCenter + fHeight*iVC) * _fScalingY, 96 * _fScalingY, (fHeight-4.0f) * _fScalingY, (_iVoiceCommand == iVC ? 0xFFCC007F : 0x0000007F));
      _pDP->PutTextCXY(Translate(astrCommands[iVC].str_String), 56 * _fScalingY, (fCenter + fHeight/2.0f + fHeight*iVC) * _fScalingY, 0xFFFFFFFF);
    }

    _pDP->PutText(TRANS("Press Weapon Prev/Next\nto change the command"), 4 * _fScalingY, (fCenter - fHeight) * _fScalingY, 0xFFFFFFFF);
  }

  // restore font defaults
  _pfdDisplayFont->SetVariableWidth();
  _pDP->SetFont(&_fdNumbersFont);
  _pDP->SetTextScaling(fTextScale);
  _pDP->SetTextCharSpacing(1);

  // prepare output strings and formats depending on game type
  FLOAT fWidthAdj = 8;
  INDEX iScore = _penPlayer->m_psGameStats.ps_iScore;
  INDEX iMana  = _penPlayer->m_iMana;

  if (bFragMatch) {
    if (!hud_bShowMatchInfo) { fWidthAdj = 4; }
    iScore = _penPlayer->m_psGameStats.ps_iKills;
    iMana  = _penPlayer->m_psGameStats.ps_iDeaths;
  } else if (bCooperative) {
    // in case of coop play, show squad (common) score
    iScore = iScoreSum;
  }

  // prepare and draw score or frags info 
  strValue.PrintF( "%d", iScore);
  fRow = pixTopBound  +fHalfUnit;
  fCol = pixLeftBound +fHalfUnit;
  fAdv = fAdvUnit+ fChrUnit*fWidthAdj/2 -fHalfUnit;
  HUD_DrawBorder( fCol,      fRow, fOneUnit,           fOneUnit, colBorder);
  HUD_DrawBorder( fCol+fAdv, fRow, fChrUnit*fWidthAdj, fOneUnit, colBorder);
  HUD_DrawText(   fCol+fAdv, fRow, strValue, colScore, 1.0f);
  HUD_DrawIcon(   fCol,      fRow, _toFrags, C_WHITE, 1.0f, FALSE, 1.0f);

  // [Cecil] Additional data
  BOOL bRenderDeaths = (bScoreMatch || bFragMatch);

  // eventually draw mana info 
  if (bScoreMatch || bFragMatch) {
    strValue.PrintF( "%d", iMana);
    fRow = pixTopBound  + fNextUnit+fHalfUnit;
    fCol = pixLeftBound + fHalfUnit;
    fAdv = fAdvUnit+ fChrUnit*fWidthAdj/2 -fHalfUnit;
    HUD_DrawBorder( fCol,      fRow, fOneUnit,           fOneUnit, colBorder);
    HUD_DrawBorder( fCol+fAdv, fRow, fChrUnit*fWidthAdj, fOneUnit, colBorder);
    HUD_DrawText(   fCol+fAdv, fRow, strValue,  colMana, 1.0f);
    HUD_DrawIcon(   fCol,      fRow, _toDeaths, C_WHITE, 1.0f, FALSE, 1.0f);
  }

  // [Cecil] Enemy counter
  if (amp_bEnemyCounter) {
    strValue.PrintF("%d", _iAliveEnemies);
    fRow = pixTopBound  + fNextUnit*(1 + bRenderDeaths) + fHalfUnit;
    fCol = pixLeftBound + fHalfUnit;
    fAdv = fAdvUnit+ fChrUnit*fWidthAdj/2 -fHalfUnit;
    HUD_DrawBorder(fCol, fRow, fOneUnit, fOneUnit, colBorder);
    HUD_DrawBorder(fCol+fAdv, fRow, fChrUnit*fWidthAdj, fOneUnit, colBorder);
    HUD_DrawText(fCol+fAdv, fRow, strValue, C_lGRAY, 1.0f);
    HUD_DrawIcon(fCol, fRow, _toEnemyCount, C_WHITE, 1.0f, FALSE, 1.0f);
  }

  // [Cecil] Token counter
  BOOL bShiftTokens = (bRenderDeaths + !!amp_bEnemyCounter);

  if (GetSP()->sp_fComboTime > 0.0f && GetSP()->sp_fTokenPayout > 0.0f) {
    strValue.PrintF("%d", _penPlayer->m_iTokens);
    fRow = pixTopBound  + fNextUnit*(1 + bShiftTokens) + fHalfUnit;
    fCol = pixLeftBound + fHalfUnit;
    fAdv = fAdvUnit+ fChrUnit*fWidthAdj/2 -fHalfUnit;
    HUD_DrawBorder(fCol, fRow, fOneUnit, fOneUnit, colBorder);
    HUD_DrawBorder(fCol+fAdv, fRow, fChrUnit*fWidthAdj, fOneUnit, colBorder);
    HUD_DrawText(fCol+fAdv, fRow, strValue, C_lGRAY, 1.0f);
    HUD_DrawIcon(fCol, fRow, _toComboToken, C_WHITE, 1.0f, FALSE, 0.8f);
  }

  // if single player or cooperative mode
  if (bSinglePlay || bCooperative) {
    // prepare and draw hiscore info 
    strValue.PrintF( "%d", Max(_penPlayer->m_iHighScore, _penPlayer->m_psGameStats.ps_iScore));
    BOOL bBeating = _penPlayer->m_psGameStats.ps_iScore>_penPlayer->m_iHighScore;
    fRow = pixTopBound+fHalfUnit;
    fCol = 320.0f-fOneUnit-fChrUnit*8/2;
    fAdv = fAdvUnit+ fChrUnit*8/2 -fHalfUnit;
    HUD_DrawBorder( fCol,      fRow, fOneUnit,   fOneUnit, colBorder);
    HUD_DrawBorder( fCol+fAdv, fRow, fChrUnit*8, fOneUnit, colBorder);
    HUD_DrawText(   fCol+fAdv, fRow, strValue, NONE, bBeating ? 0.0f : 1.0f);
    HUD_DrawIcon(   fCol,      fRow, _toHiScore, C_WHITE, 1.0f, FALSE, 1.0f);

    // prepare and draw unread messages
    if (hud_bShowMessages && _penPlayer->m_ctUnreadMessages > 0) {
      strValue.PrintF( "%d", _penPlayer->m_ctUnreadMessages);
      fRow = pixTopBound+fHalfUnit;
      fCol = pixRightBound-fHalfUnit-fAdvUnit-fChrUnit*4;
      const FLOAT tmIn = 0.5f;
      const FLOAT tmOut = 0.5f;
      const FLOAT tmStay = 2.0f;
      FLOAT tmDelta = _pTimer->GetLerpedCurrentTick()-_penPlayer->m_tmAnimateInbox;
      COLOR col = _colHUD;
      if (tmDelta>0 && tmDelta<(tmIn+tmStay+tmOut) && bSinglePlay) {
        FLOAT fRatio = 0.0f;
        if (tmDelta<tmIn) {
          fRatio = tmDelta/tmIn;
        } else if (tmDelta>tmIn+tmStay) {
          fRatio = (tmIn+tmStay+tmOut-tmDelta)/tmOut;
        } else {
          fRatio = 1.0f;
        }
        fRow+=fAdvUnit*5*fRatio;
        fCol-=fAdvUnit*15*fRatio;
        col = LerpColor(_colHUD, C_WHITE|0xFF, fRatio);
      }
      fAdv = fAdvUnit+ fChrUnit*4/2 -fHalfUnit;
      HUD_DrawBorder( fCol,      fRow, fOneUnit,   fOneUnit, col);
      HUD_DrawBorder( fCol+fAdv, fRow, fChrUnit*4, fOneUnit, col);
      HUD_DrawText(   fCol+fAdv, fRow, strValue,   col, 1.0f);
      HUD_DrawIcon(   fCol,      fRow, _toMessage, C_WHITE, 0.0f, TRUE, 1.0f);
    }
  }

  #ifdef ENTITY_DEBUG
  // if entity debug is on, draw entity stack
  HUD_DrawEntityStack();
  #endif

  // draw cheat modes
  if( GetSP()->sp_ctMaxPlayers==1) {
    INDEX iLine=1;
    ULONG ulAlpha = sin(_tmNow*16)*96 +128;
    PIX pixFontHeight = _pfdConsoleFont->fd_pixCharHeight;
    const COLOR colCheat = _colHUDText;
    _pDP->SetFont( _pfdConsoleFont);
    _pDP->SetTextScaling( 1.0f);
    const FLOAT fchtTM = cht_fTranslationMultiplier; // for text formatting sake :)
    if( fchtTM > 1.0f)  { _pDP->PutTextR( "turbo",     _pixDPWidth-1, _pixDPHeight-pixFontHeight*iLine, colCheat|ulAlpha); iLine++; }
    if( cht_bInvisible) { _pDP->PutTextR( "invisible", _pixDPWidth-1, _pixDPHeight-pixFontHeight*iLine, colCheat|ulAlpha); iLine++; }
    if( cht_bGhost)     { _pDP->PutTextR( "ghost",     _pixDPWidth-1, _pixDPHeight-pixFontHeight*iLine, colCheat|ulAlpha); iLine++; }
    if( cht_bFly)       { _pDP->PutTextR( "fly",       _pixDPWidth-1, _pixDPHeight-pixFontHeight*iLine, colCheat|ulAlpha); iLine++; }
    if( cht_bGod)       { _pDP->PutTextR( "god",       _pixDPWidth-1, _pixDPHeight-pixFontHeight*iLine, colCheat|ulAlpha); iLine++; }
  }

  // in the end, remember the current time so it can be used in the next frame
  _tmLast = _tmNow;
};

// initialize all that's needed for drawing the HUD
extern void InitHUD(void) {
  // try to
  try {
    // initialize and load HUD numbers font
    DECLARE_CTFILENAME(fnFont, "Fonts\\Numbers3.fnt");
    _fdNumbersFont.Load_t(fnFont);

    // initialize status bar textures
    _toHealth.SetData_t(CTFILENAME("TexturesMP\\Interface\\HSuper.tex"));
    _toOxygen.SetData_t(CTFILENAME("TexturesMP\\Interface\\Oxygen-2.tex"));
    _toFrags.SetData_t(CTFILENAME("TexturesMP\\Interface\\IBead.tex"));
    _toDeaths.SetData_t(CTFILENAME("TexturesMP\\Interface\\ISkull.tex"));
    _toScore.SetData_t(CTFILENAME("TexturesMP\\Interface\\IScore.tex"));
    _toHiScore.SetData_t(CTFILENAME("TexturesMP\\Interface\\IHiScore.tex"));
    _toMessage.SetData_t(CTFILENAME("TexturesMP\\Interface\\IMessage.tex"));
    _toMana.SetData_t(CTFILENAME("TexturesMP\\Interface\\IValue.tex"));
    _toArmorSmall.SetData_t(CTFILENAME("TexturesMP\\Interface\\ArSmall.tex"));
    _toArmorMedium.SetData_t(CTFILENAME("TexturesMP\\Interface\\ArMedium.tex"));
    _toArmorLarge.SetData_t(CTFILENAME("TexturesMP\\Interface\\ArStrong.tex"));

    _toASeriousBomb.SetData_t(CTFILENAME("TexturesMP\\Interface\\AmSeriousBomb.tex"));
        
    // initialize powerup textures (DO NOT CHANGE ORDER!)
    _atoPowerups[0].SetData_t(CTFILENAME("TexturesMP\\Interface\\PInvisibility.tex"));
    _atoPowerups[1].SetData_t(CTFILENAME("TexturesMP\\Interface\\PInvulnerability.tex"));
    _atoPowerups[2].SetData_t(CTFILENAME("TexturesMP\\Interface\\PSeriousDamage.tex"));
    _atoPowerups[3].SetData_t(CTFILENAME("TexturesMP\\Interface\\PSeriousSpeed.tex"));
    // initialize sniper mask texture
    _toSniperMask.SetData_t(CTFILENAME("TexturesMP\\Interface\\SniperMask.tex"));
    _toSniperWheel.SetData_t(CTFILENAME("TexturesMP\\Interface\\SniperWheel.tex"));
    _toSniperArrow.SetData_t(CTFILENAME("TexturesMP\\Interface\\SniperArrow.tex"));
    _toSniperEye.SetData_t(CTFILENAME("TexturesMP\\Interface\\SniperEye.tex"));
    _toSniperLed.SetData_t(CTFILENAME("TexturesMP\\Interface\\SniperLed.tex"));

    // initialize tile texture
    _toTile.SetData_t(CTFILENAME("Textures\\Interface\\Tile.tex"));
    
    // set all textures as constant
    ((CTextureData*)_toHealth .GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toOxygen .GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toFrags  .GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toDeaths .GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toScore  .GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toHiScore.GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toMessage.GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toMana   .GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toArmorSmall.GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toArmorMedium.GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toArmorLarge.GetData())->Force(TEX_CONSTANT);

    ((CTextureData*)_toASeriousBomb.GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_atoPowerups[0].GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_atoPowerups[1].GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_atoPowerups[2].GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_atoPowerups[3].GetData())->Force(TEX_CONSTANT);

    ((CTextureData*)_toTile      .GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toSniperMask.GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toSniperWheel.GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toSniperArrow.GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toSniperEye.GetData())->Force(TEX_CONSTANT);
    ((CTextureData*)_toSniperLed.GetData())->Force(TEX_CONSTANT);

    // [Cecil] AMP 2 textures
    _toEnemyCount.SetData_t(CTFILENAME("Textures\\Interface\\EnemyCount.tex"));
    ((CTextureData*)_toEnemyCount.GetData())->Force(TEX_CONSTANT);
    _toComboToken.SetData_t(CTFILENAME("Textures\\Interface\\Token.tex"));
    ((CTextureData*)_toComboToken.GetData())->Force(TEX_CONSTANT);

  } catch (char *strError) {
    FatalError(strError);
  }
};

// clean up
extern void EndHUD(void) {};
