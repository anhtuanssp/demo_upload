jQuery(document).ready(function($) {
    'use strict';
    var storage = new LargeLocalStorage({
        size: 2000 * 1024 * 1024,
        name: 'demo-resumable-app'
    });

    storage.initialized.then(function() {
        console.log(storage.getCapacity());

        // storage
        //     .getAttachment('myFileDemo', localStorage.getItem('filename'))
        //     .then(function(evt) {
        //         resumeUpload(evt);
        //     });
        if (localStorage.getItem('success') == 'fail') {
            $('#reupload').show();
            $('#reupload').click(function(event) {
                storage
                    .getAttachment('myFileDemo', localStorage.getItem('filename'))
                    .then(function(evt) {
                        resumeUpload(evt);
                    });
            });
        }
        $('#upload').click(function(event) {
            storage
                .getAttachment('myFileDemo', localStorage.getItem('filename'))
                .then(function(evt) {
                    resumeUpload(evt);
                });
        });
    }, function() {
        console.log('denied');
    });

    var handleFileSelect = handleFileSelectFunction;

    function handleFileSelectFunction(evt) {

        var files = evt.target.files;
        var file = files[0];

        localStorage.setItem('filename', file.name);

        storage.setAttachment('myFileDemo', file.name, file);

    }

    function resumeUpload(evt) {
        console.log('Resume upload')
        console.log(evt)
        var ck = new chunkFileUpload(evt);
        ck.processTotal = 0;
        ck.$elProcess.css('width', '0%');
        ck.startUpload();
    }

    function chunkFileUpload(file) {
        this.file = file;
        this.BYTES_PER_CHUNK = 1048576 * 10;
        this.SIZE = file.size;
        this.NUM_CHUNKS = Math.max(Math.ceil(this.SIZE / this.BYTES_PER_CHUNK), 1);
        this.start = 0;
        this.end = this.BYTES_PER_CHUNK;
        this.slice_method = 'slice';
        this.url = '/Upload-Broken-Browser/upload.php';
        this.uploaders = [];

        this.processTotal = 0;
        this.$elProcess = $('.progress-bar');
        localStorage.setItem('processing', '');
        localStorage.setItem('success', 'fail');

        this.getSliceMethod = function() {
            if ('mozSlice' in this.file) {
                this.slice_method = 'mozSlice';
            } else if ('webkitSlice' in this.file) {
                this.slice_method = 'webkitSlice';
            } else {
                this.slice_method = 'slice';
            }
        }

        this.startUpload = function() {
            this.slice_method = this.getSliceMethod();
            var i = 0;
            while (this.start < this.SIZE) {
                this.uploadPerBlob(this.file.slice(this.start, this.end), i);
                // console.log(this.file.slice(this.start, this.end))
                this.start = this.end;
                this.end = this.start + this.BYTES_PER_CHUNK;
                i++;
            }
        }

        this.uploadPerBlob = function(blobOrFile, i) {
            var success = localStorage.getItem('success');
            if (success !== 'success') {
                // if(!this.checkProcessUpload(i)){
                var that = this;
                var xhr = new XMLHttpRequest();
                xhr.open('POST', this.url, true);
                xhr.overrideMimeType('application/octet-stream');
                if (this.start !== 0) {
                    xhr.setRequestHeader('Content-Range', 'bytes ' + this.start + '-' + this.end);
                }

                xhr.setRequestHeader('PART', i);
                xhr.setRequestHeader('KEY_NAME', localStorage.getItem('filename'));
                xhr.setRequestHeader('CHUNK_FILE_SIZE', blobOrFile.size);
                xhr.setRequestHeader('TOTAL_SIZE', this.file.size);
                xhr.setRequestHeader('TOTAL_CHUNK', this.NUM_CHUNKS);

                xhr.onprogress = function(e) {

                };
                xhr.onreadystatechange = function() {
                    if (xhr.readyState == 4 && xhr.status == 200) {
                        that.processTotal = that.processTotal + 1;
                        that.updateProcessBar();
                        var data = xhr.response;
                        if (data != '') {
                            try {
                                data = JSON.parse(data);
                                if (data.upload == 'success') {
                                    that.uploadSuccess();
                                }
                            } catch (e) {
                                // statements
                                console.log(e);
                            }

                        }
                    }
                }
                xhr.onloadend = function(e) {
                    that.uploaders.pop();
                    if (!that.uploaders.length) {

                    }
                };
                that.uploaders.push(xhr);
                xhr.send(blobOrFile);
                // }
            }
        }

        this.updateProcessBar = function() {
            var percent = (this.processTotal / this.NUM_CHUNKS) * 100;
            this.$elProcess.css({
                width: percent + '%',
            });
        }

        this.uploadSuccess = function() {
            localStorage.setItem('success', 'success');
            localStorage.setItem('processing', '');
        }

        this.checkProcessUpload = function(index) {
            var flag = false;

            return flag;
        }
    }



    document.getElementById('ff')
        .addEventListener('change', handleFileSelect, false);
});
