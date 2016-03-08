<?php 
error_reporting(E_ALL ^ E_NOTICE);
/**
 *
 * Logging operation - to a file (upload_log.txt) and to the stdout
 * @param string $str - the logging string
 */
function _log($str) {

    // log to the output
    $log_str = date('d.m.Y').": {$str}\r\n";
    echo $log_str;

    // log to file
    if (($fp = fopen('upload_log.txt', 'a+')) !== false) {
        fputs($fp, $log_str);
        fclose($fp);
    }
}

/**
 * 
 * Delete a directory RECURSIVELY
 * @param string $dir - directory path
 * @link http://php.net/manual/en/function.rmdir.php
 */
function rrmdir($dir) {
    if (is_dir($dir)) {
        $objects = scandir($dir);
        foreach ($objects as $object) {
            if ($object != "." && $object != "..") {
                if (filetype($dir . "/" . $object) == "dir") {
                    rrmdir($dir . "/" . $object); 
                } else {
                    unlink($dir . "/" . $object);
                }
            }
        }
        reset($objects);
        rmdir($dir);
    }
}


function createFileFromChunks($temp_dir, $fileName, $chunkSize, $totalSize,$total_files) {

    // count all the parts of this file
    $total_files_on_server_size = 0;
    $temp_total = 0;
    foreach(scandir($temp_dir) as $file) {
        $temp_total = $total_files_on_server_size;
        $tempfilesize = filesize($temp_dir.'/'.$file);
        $total_files_on_server_size = $temp_total + $tempfilesize;
    }
    // check that all the parts are present
    // If the Size of all the chunks on the server is equal to the size of the file uploaded.
    if ($total_files_on_server_size >= $totalSize) {
    // create the final destination file 
        $d = new DateTime();
        $tt = $d->getTimestamp();
        if (($fp = fopen('upload/'.$tt.'-'.$fileName, 'w')) !== false) {
            for ($i=0; $i<$total_files; $i++) {
                fwrite($fp, file_get_contents($temp_dir.'/'.$fileName.'.part'.$i));
                // _log('writing chunk '.$i);
            }
            fclose($fp);
        } else {
            _log('cannot create the destination file');
            return false;
        }

        // // rename the temporary directory (to avoid access from other 
        // // concurrent chunks uploads) and than delete it
        if (rename($temp_dir, $temp_dir.'_UNUSED')) {
            rrmdir($temp_dir.'_UNUSED');
        } else {
            rrmdir($temp_dir);
        }

        header('Content-Type: application/json');
        echo json_encode(array( 'upload' => 'success'));
    }

}

$re_header = getallheaders();

$part = $re_header['PART'];
$key = $re_header['KEY_NAME'];
$chunkFileSize =  $re_header['CHUNK_FILE_SIZE'];
$totalSize =  $re_header['TOTAL_SIZE'];
$totalChunk =  $re_header['TOTAL_CHUNK'];

$post = file_get_contents('php://input');
// init the destination file (format <filename.ext>.part<#chunk>
// the file is stored in a temporary directory
if(isset($part) && trim($key)!=''){
    $temp_dir = 'upload/'.$key;
}
$dest_file = $temp_dir.'/'.$key.'.part'.$part;
// create the temporary directory

if (!is_dir($temp_dir)) {
    mkdir($temp_dir, 0777, true);
}

// move the temporary file

if (!file_put_contents($dest_file, $post)) {
    _log('Error saving (move_uploaded_file) chunk '.$part.' for file '.$key);
} else {
    // check if all the parts present, and create the final destination file
    createFileFromChunks($temp_dir, $key ,$chunkFileSize, $totalSize , $totalChunk);
}
 ?>