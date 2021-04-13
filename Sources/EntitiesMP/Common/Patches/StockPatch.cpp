#include "StdH.h"

#include "StockPatch.h"
#include "PatchFunctions.h"

// Patch config
extern DJSON_Block _cbConfig;
extern INDEX _ctConfigEntries;

// Patch the entity class link file
static void PatchClassLink_t(CTString &strClass) {
  // no replacements
  if (_ctConfigEntries <= 0) {
    return;
  }

  // open the class file
  CTFileStream strm;
  strm.Open_t(strClass);

  // read library name
  CTFileName fnDLL;
  fnDLL.ReadFromText_t(strm, "Package: ");

  // class name
  CTString strClassName;
  strClassName.ReadFromText_t(strm, "Class: ");

  strm.Close();

  // go through the replacement config
  CTString strLibraryName = fnDLL.FileName().str_String;

  for (INDEX iClass = 0; iClass < _ctConfigEntries; iClass++) {
    string strReplace = _cbConfig.GetKey(iClass);
    CConfigValue valNewClass = _cbConfig.GetValue(iClass);

    if (valNewClass.cv_eType != CVT_STRING) {
      FatalError("Replacement for \"%s\" is not a string!", strReplace.c_str());
    }

    // wrong class
    if (strClassName != strReplace.c_str()) {
      continue;
    }

    string strNewClass = valNewClass.cv_strValue;

    // ignore the same classes
    if (strClassName == strNewClass.c_str() && strLibraryName == "Entities") {
      continue;
    }

    // replace the class file
    strClass = strNewClass.c_str();
  }
};

// Class table
static CDList<string> _aClassNames;
static CDList<CEntityClass *> _aClasses;

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
  INDEX iClass = _aClassNames.FindIndex(strFile);

  if (iClass != -1) {
    CEntityClass *pExisting = _aClasses[iClass];
  
    // mark that it is used once again
    pExisting->MarkUsed();
    return pExisting;
  }

  // create patched class
  CEntityClass *ptNew = new CEntityClass;
  ptNew->ser_FileName = fnECL;

  // add to the lists and get its index
  iClass = _aClassNames.Add(strFile);
  _aClasses.Add(ptNew);

  try {
    // load it
    ptNew->Load_t(fnECL);

  } catch (char *) {
    // delete the class
    _aClassNames.Delete(iClass);
    _aClasses.Delete(iClass);

    delete ptNew;
    throw;
  }

  // mark that it is used for the first time
  ptNew->MarkUsed();
  return ptNew;
};

// Release an object when not needed any more
void CClassStockPatch::Release(CEntityClass *ptObject) {
  // mark that it is used one less time
  ptObject->MarkUnused();

  // if it is not used at all any more and should be freed automatically
  if (!ptObject->IsUsed() && ptObject->IsAutoFreed()) {
    // remove it from stock
    INDEX iClass = _aClasses.FindIndex(ptObject);

    _aClassNames.Delete(iClass);
    _aClasses.Delete(iClass);

    delete ptObject;
  }
};

// Free all unused elements of the stock
void CClassStockPatch::FreeUnused(void) {
  BOOL bAnyRemoved;

  do {
    // create container of objects that should be freed
    CDList<CEntityClass *> aToFree;
    CDList<INDEX> aiTable;

    for (INDEX i = 0; i < _aClasses.Count(); i++) {
      CEntityClass *pClass = _aClasses[i];

      if (!pClass->IsUsed()) {
        aToFree.Add(pClass);
        aiTable.Add(i);
      }
    }

    bAnyRemoved = (aToFree.Count() > 0);

    // for each object that should be freed
    for (INDEX iFree = 0; iFree < aToFree.Count(); iFree++) {
      CEntityClass *pClass = aToFree[iFree];
      INDEX iTableIndex = aiTable[iFree];

      _aClassNames.Delete(iTableIndex);
      // [Cecil] NOTE: Crashes here sometimes on "Stop Game"
      _aClasses.Delete(iTableIndex);

      delete pClass;
    }

  // as long as there is something to remove
  } while (bAnyRemoved);
};
