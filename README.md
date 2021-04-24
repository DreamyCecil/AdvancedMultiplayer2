# Advanced Multiplayer 2 Mod
This is the source code of a mod for classic Serious Sam: The Second Encounter v1.07 that adds a lot of options for multiplayer games including coop mode support for singleplayer maps.
Based on Serious Sam SDK v1.07 for Visual Studio 2013 ( https://github.com/DreamyCecil/SeriousSam_SDK107 )

Download Advanced Multiplayer Mod v1.9: https://dreamycecil.github.io/sam/files/advanced-mp

Building
--------

To compile the source code, you'll need to use a compiler from Microsoft Visual C++ 6.0.

1. First, you need to download and install `Microsoft Visual C++ 6.0` with Service Pack 6. Keep in mind that it may not run on your OS correctly or finish the installation at all, you'll have to go to the installation place (e.g. `C:\Program Files (x86)\Microsoft Visual Studio\VC98`) and see if there is anything (should run correctly on Windows 7 x64 and lower).
2. Second, you need to download and install `Visual Studio 2010` (only C++ tools are enough).
3. Then you need to install `Visual Studio 2013` (or even newer, although it wasn't tested). After this you'll be able to open the project files, but you can't compile them using the `v60` toolset yet.
4. Now you need to download and install `Daffodil`. It's a set of configuration files that allows newer Visual Studios to target older VC compilers.
As said on the http://daffodil.codeplex.com/ , it is possible to use newer Visual Studios as long as Visual Studio 2010 is also installed, otherwise it won't work.

Now you are able to build the entire solution (`Sources/AdvancedMP.sln`) but make sure that all of the projects have `v60` set as their platform toolset (**Project properties** -> **Configuration Properties** -> **General** -> **Platform Toolset**).

**NOTE:** Debugging tools from newer studios are unable to use program database files (.PDB) that are generated with `v60`, making traditional debugging impossible. If you wish to debug your code normally, consider using Microsoft Visual C++ 6.0 or if you can't use it, base it on Serious Engine v1.10 source code and then port `EntitiesMP`, `GameGUIMP` and `GameMP` code it back to this project.

Remember to **not** use spaces in the path to the solution.

Running
-------

Once the project is compiled, there should be three libraries in the Bin folder: `EntitiesMP.dll`, `GameGUIMP.dll` and `GameMP.dll`.

There are two ways to start the mod:
1. Create a `.des` file in your Mods directory under the same name as this repository, open it in any text editor and type your mod name in it. Then you'll be able to launch your mod from the game's `Mods` list.
2. Run `ModStart.bat` or `EditorStart.bat` from the Bin folder to open the editor or the mod.

When running a selected project, make sure the mod in project properties **Debugging** -> **Command Arguments** is set to your mod name instead of `AMP2` (example: `+game AMP2_Mod`).

License
-------

Just like Croteam's Serious Engine 1.10 source code ( https://github.com/Croteam-official/Serious-Engine ), Serious Sam SDK is licensed under the GNU GPL v2 (see LICENSE file).

This SDK includes Croteam's Entity Class Compiler (`Sources/Extras/Ecc.exe`) that is used to compile `.es` files and officially distributed with classic Serious Sam games. Its source code is included in Serious Engine 1.10.

Some of the code included with the SDK may not be licensed under the GNU GPL v2:

* DirectX8 SDK (Headers & Libraries) (`d3d8.h`, `d3d8caps.h` and `d3d8types.h` located in `Sources/Extras`) by Microsoft
