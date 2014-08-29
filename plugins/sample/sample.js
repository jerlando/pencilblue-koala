/**
 * SamplePlugin - A sample for exemplifying what the main module file should
 * look like.
 *
 * @author Brian Hyder <brian@pencilblue.org>
 * @copyright 2014 PencilBlue, LLC
 */
function SamplePlugin(){}

/**
 * Called when the application is being installed for the first time.
 *
 * @param cb A callback that must be called upon completion.  cb(Error, Boolean).
 * The result should be TRUE on success and FALSE on failure
 */
SamplePlugin.onInstall = function(cb) {
	cb(null, true);
};

/**
 * Called when the application is uninstalling this plugin.  The plugin should
 * make every effort to clean up any plugin-specific DB items or any in function
 * overrides it makes.
 *
 * @param cb A callback that must be called upon completion.  cb(Error, Boolean).
 * The result should be TRUE on success and FALSE on failure
 */
SamplePlugin.onUninstall = function(cb) {
	cb(null, true);
};

/**
 * Called when the application is starting up. The function is also called at
 * the end of a successful install. It is guaranteed that all core PB services
 * will be available including access to the core DB.
 *
 * @param cb A callback that must be called upon completion.  cb(Error, Boolean).
 * The result should be TRUE on success and FALSE on failure
 */
SamplePlugin.onStartup = function(cb) {
	cb(null, true);
};

/**
 * Called when the application is gracefully shutting down.  No guarantees are
 * provided for how much time will be provided the plugin to shut down.
 *
 * @param cb A callback that must be called upon completion.  cb(Error, Boolean).
 * The result should be TRUE on success and FALSE on failure
 */
SamplePlugin.onShutdown = function(cb) {
	cb(null, true);
};

//exports
module.exports = SamplePlugin;