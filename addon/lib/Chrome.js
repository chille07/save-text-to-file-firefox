var {Cc,Ci,Cu,components} = require("chrome"),
	Preference = require("./Preference"),
	Tab = require("./Tab"),
	Notification = require("./Notification"),
	Localisation = require("./Localisation"),
	Panel = require("./Panel"),
	System = require("./System"),
	Utils = require("./Utils");

exports.getHomeDir = function() {
	
	return Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("Home", Ci.nsIFile);
}

exports.selectDir = function(selectedText) {
	
	var nsIFilePicker = Ci.nsIFilePicker, 
		fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
    
	fp.init(require("sdk/window/utils").getMostRecentBrowserWindow(), 
			Localisation.getString("browse_title"), 
			nsIFilePicker.modeGetFolder);

    var ret = fp.show();
    
    if (ret == nsIFilePicker.returnOK || ret == nsIFilePicker.returnReplace) {
    	
    	Preference.set("pathToFile", fp.file.path);
    	Panel.show(selectedText);
    };
}

function createFileObject(saveDirectory, fileName) {
	
	var currentDate = new Date(),
		dateString = Utils.createDateString(Preference.get('dateFormat'), currentDate),
		timeString = Utils.createTimeString(currentDate);

	// check whether file name should include date and/or time stamps
	if (Preference.get('datestamp')) {fileName += "--" + dateString;}
	if (Preference.get('saveMode') == 0){
		if (Preference.get('timestamp')) {fileName += "--" + timeString;}
	}
	

	if (Preference.get('format') == 0){
		
		fileName = Utils.sanitizeFilename(fileName) + ".txt";
		
	}else{
		
		fileName = Utils.sanitizeFilename(fileName) + ".csv";
	}
	
	
	var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
	
	file.initWithPath(saveDirectory);
    file.append(fileName);
    
    return file;
}

exports.createFileObject = function(saveDirectory, fileName) {
	
	return createFileObject(saveDirectory, fileName);
}

exports.saveTo = function(selectedText){
	
	Cu.import("resource://gre/modules/NetUtil.jsm");
    Cu.import("resource://gre/modules/FileUtils.jsm");
    
    var filename;
    
    if (Preference.get('pagenameForFilename')){
    	
    	filename = Tab.getTitle();
    	
    }else{
    	
    	filename = Preference.get('fileName');
    }
    

    var ostream,
    	string = '\n\n',
    	currentDate = new Date(),
    	dateString = Utils.createDateString(Preference.get('dateFormat'), currentDate),
    	timeString = Utils.createTimeString(currentDate),
    	file = createFileObject(Preference.get('pathToFile'), filename);
	
	try{        
        
    	if (file.exists() === false) {file.create(Ci.nsIFile.NORMAL_FILE_TYPE, 420);}
        
        if (Preference.get('saveMode') == 0){
        	ostream = FileUtils.openSafeFileOutputStream(file, FileUtils.MODE_WRONLY | FileUtils.MODE_CREATE | FileUtils.MODE_TRUNCATE);
        	
        }else{
        	ostream = FileUtils.openFileOutputStream(file, FileUtils.MODE_WRONLY | FileUtils.MODE_APPEND);
        }
        

        var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        
        if (Preference.get('lineSeparator')){
        	string += '\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\n\n';
        }
        
        if (Preference.get('datestampInLine')){
        	string += dateString + '\n\n';
        }
        
        if (Preference.get('timestampInLine')){
        	string += timeString + '\n\n';
        }
        
        if (Preference.get('currentURL')){
        	string += Tab.getURL() + '\n\n';
        }
        
        var combinedString = string + selectedText;
        
        if (System.getPlatform().indexOf('win') >= 0){
        	combinedString = combinedString.replace(/[\n]/g, '\r\n');
        }
        
        var istream = converter.convertToInputStream(combinedString);

        // The last argument (the callback) is optional.
        NetUtil.asyncCopy(istream, ostream, function(status) {
        	
        	if (!components.isSuccessCode(status)) {
        		
        		if (Preference.get('showNotifications')){
        			
        			Notification.sendMsg("saveError_id", file.path);        			
        		}

        	}else{
        		
        		if (Preference.get('showNotifications')){
        			
        			Notification.sendMsg("saveComplete_id", file.path);
        		}
        	}
        });
	} catch (e) {
        return false;
    }
}
