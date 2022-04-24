// [Cecil] Functions for hooking
extern void (*DJSON_pErrorFunction)(const char *);
extern void (*DJSON_pPrintFunction)(const char *);
extern DJSON_String (*DJSON_pLoadConfigFile)(DJSON_String);

// [Cecil] Config loading function
DECL_DLL DJSON_String LoadConfigFile(DJSON_String strFile);

// [Cecil] Get entity patch config
DECL_DLL CTString GetPatchConfig(CEntity *pen, const CTString &strType);

// [Cecil] Get integer value
DECL_DLL BOOL GetConfigInt(CConfigBlock &cb, DJSON_String strKey, INDEX &iValue);
// [Cecil] Get float value
DECL_DLL BOOL GetConfigFloat(CConfigBlock &cb, DJSON_String strKey, FLOAT &fValue);

// [Cecil] Get CTString value
DECL_DLL BOOL GetConfigString(CConfigBlock &cb, DJSON_String strKey, CTString &strValue);
// [Cecil] Get CTFileName value
DECL_DLL BOOL GetConfigPath(CConfigBlock &cb, DJSON_String strKey, CTFileName &fnValue);

// [Cecil] Get 3D vector value
DECL_DLL BOOL GetConfigVector(CConfigBlock &cb, DJSON_String strKey, FLOAT3D &vValue);
// [Cecil] Get 3D placement value
DECL_DLL BOOL GetConfigPlacement(CConfigBlock &cb, DJSON_String strKey, CPlacement3D &plValue);

// [Cecil] Load model from a path
DECL_DLL BOOL SetConfigModel(CConfigBlock &cb, DJSON_String strKey, CModelObject &mo);
// [Cecil] Load texture from a path
DECL_DLL BOOL SetConfigTexture(CConfigBlock &cb, DJSON_String strKey, CTextureObject &to);
