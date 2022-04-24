#include "StdH.h"

#include "StockPatch.h"
#include "PatchFunctions.h"

// Entity class name table
#define TYPE CEntityClass
#define CNameTable_TYPE CNameTable_CEntityClass
#define CNameTableSlot_TYPE CNameTableSlot_CEntityClass

#include <Engine/Templates/NameTable.cpp>

#undef CNameTableSlot_TYPE
#undef CNameTable_TYPE
#undef TYPE

// Patch config
extern DJSON_Block _cbConfig;

// Patch the entity class link file
static void PatchClassLink_t(CTString &strClass) {
  // no replacements
  if (_cbConfig.Count() <= 0) {
    return;
  }

  // open the class file
  CTFileStream strm;
  strm.Open_t(strClass);

  // read library name
  CTFileName fnDLL;
  fnDLL.ReadFromText_t(strm, "Package: ");

  // class name
  CTString strEntityName;
  strEntityName.ReadFromText_t(strm, "Class: ");

  strm.Close();

  // go through the replacement config
  CTString strLibraryName = fnDLL.FileName().str_String;

  for (INDEX iClass = 0; iClass < _cbConfig.Count(); iClass++) {
    string strReplace = _cbConfig.GetKey(iClass);
    CConfigValue valNewClass = _cbConfig.GetValue(iClass);

    // wrong class
    if (strEntityName != strReplace.c_str()) {
      continue;
    }

    // not a path to the class file
    if (valNewClass.cv_eType != CVT_STRING) {
      FatalError("Replacement for \"%s\" is not a string!", strReplace.c_str());
    }

    // replace the class file
    strClass = valNewClass.cv_strValue;

    // all done
    return;
  }
};

// Obtain an object from stock - loads if not loaded
CEntityClass *CClassStockPatch::Obtain_t(const CTFileName &fnmFileName) {
  // try to patch the class link file
  CTString fnECL = fnmFileName.str_String;

  try {
    PatchClassLink_t(fnECL);

  } catch (char *) {
    throw;
  }

  string strFile = fnECL.str_String;

  // find stocked object with same name
  CEntityClass *pExisting = st_ntObjects.Find(strFile.c_str());

  if (pExisting != NULL) {
    // mark that it is used once again
    pExisting->MarkUsed();
    return pExisting;
  }

  // create patched class
  CEntityClass *ptNew = new CEntityClass;
  ptNew->ser_FileName = fnECL;

  // add to the lists and get its index
  st_ctObjects.Add(ptNew);
  st_ntObjects.Add(ptNew);

  try {
    // load it
    ptNew->Load_t(fnECL);

  } catch (char *) {
    // delete the class
    st_ctObjects.Remove(ptNew);
    st_ntObjects.Remove(ptNew);

    delete ptNew;
    throw;
  }

  // mark that it is used for the first time
  ptNew->MarkUsed();
  return ptNew;
};
