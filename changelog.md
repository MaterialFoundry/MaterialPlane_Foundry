# Changelog Material Plane Foundry Module

### v2.1.0 - 12-10-2021
<b>Updating the sensor firmware to v2.1.0 is required</b>
Additions:
<ul>
    <li>You can now configure the websocket port to use. <b>For current users: This means that you need to add this to the 'Sensor Module IP Address' module setting</b></li>
    <li>Material Plane can connect through Material Server, using it as a proxy server to allow MP to function on SSL Foundry servers (requires MS v1.0.3)</li>
    <li>Through Material Server, MP can connect to the server using the USB Serial Port (requires MS v1.0.3)</li>
    <li>Added offset compensation for when, after calibration, there is an offset between the base location and in-game location</li>
    <li>Made elements in the calibration screen collapsible to prevent excessive scrolling</li>
    <li>Added 'Auto exposure' button to the calibration screen (only works for Beta HW)</li>
</ul>

Fixes:
<ul>
    <li>All pen functions now work properly</li>
    <li>If a token was dropped on the same spot it as picked up from, the token location would not return to the center of the grid. This has been fixed</li>
</ul>

Other:
<ul>
    <li>Cursor of the pen now hides after 1 second of inactivity</li>
    <li>Reduced the max average count to 20</li>
    <li>Minor changes to the communication protocol between sensor and module</li>
    <li>Battery percentage calculation has been moved to the sensor</li>
</ul>

Compatible with:
<ul>
    <li><b>Sensor firmware: </b>v2.1.0</li>
    <li><b>Material Server: </b>v1.0.3</li>
</ul>

### v2.0.1 - 16-07-2021
Additions:
<ul>
    <li>'Average Count' is now also editable for DIY sensors (using calibration screen), which allows you to improve positional accuracy at the cost of responsiveness.</li>
    <li>Improved on-screen calibration instructions</li>
</ul>

Fixes:
<ul>
    <li>Fixed issue where sensor would stay in calibration mode if calibration was not successfully completed.</li>
    <li>Removed console error that appeared for the GM when calibration was done.</li>
    <li>WebSocket client no longer creates duplicate connections, which resulted in errors</li>
</ul>

Other:
<ul>
    <li>Removed 'Hardware Variant' module setting, since it's now autodetected</li>
</ul>

### v2.0.0 - 15-07-2021
This is basically a complete rewrite of the module, made with support for the new hardware in mind.<br>
The old hardware is compatible, but requires an update.<br>
Please not that the configuration for the new hardware is completely different, please read the documentation: https://github.com/CDeenen/MaterialPlane/wiki/Arduino-Instructions<br>
Foundry 0.7 is no longer supported.<br>

### v1.0.2 - 26-10-2020
Additions:
<ul>
    <li>Localization support</li>
    <li>Added a warning that the module does not work over SSL</li>
    <li>0.7.5 support, including the new token drag vision setting</li>
</ul>
Foundry v0.6.6 is no longer supported (it might still work, though)

### v1.0.1 - 27-09-2020
Fixes:
<ul>
    <li>Simplified and improved sensitivity settings</li>
    <li>Fixed issue where the calibration menu would not update properly</li>
    <li>Bigger tokens now center properly</li>
    <li>Multipoint calibration fixed, multipoint offset added</li>
</ul>
Additions:
<ul>
    <li>Added X and Y compensation to fine-tune the measured coordinate</li>
    <li>Added calibration and offset checkboxes to calibration menu</li>
    <li>Added low battery notification</li>
</ul>

### v1.0.0 - 22-09-2020
Initial Release