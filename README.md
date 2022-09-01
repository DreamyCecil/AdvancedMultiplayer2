# Advanced Multiplayer 2 Mod
This is the source code of a mod for classic Serious Sam: The Second Encounter v1.07 that adds a lot of options for multiplayer games including coop mode support for singleplayer maps.
Based on [Serious Engine 1 Mod SDK](https://github.com/DreamyCecil/SE1-ModSDK)

Download Advanced Multiplayer Mod v1.9: https://dreamycecil.github.io/sam/files/advanced-mp

Building
--------

To compile the source code, you'll need to use a compiler from Microsoft Visual C++ 6.0.

Full guide: https://github.com/DreamyCecil/SE1-ModSDK#building

Running
-------

Once the project is compiled, there should be three libraries in the Bin folder: `EntitiesMP.dll`, `GameGUIMP.dll` and `GameMP.dll`.

There are two ways to start the mod:
1. Create a `.des` file in your Mods directory under the same name as this repository, open it in any text editor and type your mod name in it. Then you'll be able to launch your mod from the game's `Mods` list.
2. Run `ModStart.bat` or `EditorStart.bat` from the Bin folder to open the editor or the mod.

When running a selected project, make sure the mod in project properties **Debugging** -> **Command Arguments** is set to your mod name instead of `AMP2` (example: `+game AMP2_Mod`).

License
-------

Just like Croteam's [Serious Engine 1.10](https://github.com/Croteam-official/Serious-Engine) source code, Serious Sam SDK is licensed under the GNU GPL v2 (see LICENSE file).

This SDK includes Croteam's Entity Class Compiler (`Sources/Includes/Ecc.exe`) that is used to compile entity source files (`*.es`) and is officially distributed with classic Serious Sam games. Its source code is included in Serious Engine 1.10.

Some of the code included with the SDK may not be licensed under the GNU GPL v2:

* DirectX8 SDK (Headers & Libraries) (`d3d8.h`, `d3d8caps.h` and `d3d8types.h` located in `Sources/Includes`) by Microsoft
