var UPLOAD_MANAGER = (function() {
    'use strict';
    /**
     * @author tuantruong
     * Upload management, allow resumable
     * download when you close browser
     * requrie html5 and modern browser
     */
    var UploadManager = function(elId) {

        this.id = elId;
        this.init = initFunction;
        this._drop = _dropFunction;
        this._copyDragover = _copyDragoverFunction;

        // LLS
        this.storage = new LargeLocalStorage({
            size: 2000 * 1024 * 1024,
            name: 'demo-resumable-app'
        });
        this.attachmentName = 'myFileDemo';
        this.initStorage = initStorageFunction;

        // Upload Item list
        this.listUploadItem = [];

        var _CONSTANT = {
                class_list: 'upload-list-file'
            },
            that = this;

        this.getConstant = function() {
            return _CONSTANT;
        }

        function initFunction() {
            //render list file
            _renderListFileFunction();

            this.initStorage();
        }

        function initStorageFunction() {


            that.storage.initialized.then(function() {

                console.log(that.storage.getCapacity());
                that._renderFileItems();

            }, function() {

                console.log('denied');

            });
        }

        function _renderListFileFunction() {
            var html = '<div class="' + _CONSTANT.class_list + ' row"></div>';
            $(that.id).append(html);
            $(that.id).find('.' + _CONSTANT.class_list)
                .css({
                    width: '100%',
                    'min-height': '200px',
                    border: '1px solid #fafafa'
                });
            $(that.id)
                .find('.' + _CONSTANT.class_list)
                .on('dragover', that._copyDragover);
            $(that.id)
                .find('.' + _CONSTANT.class_list)
                .on('drop', that._drop);

        }

        function _dropFunction(e) {
            e.stopPropagation();
            e.preventDefault();
            e = e.originalEvent;

            // foreach(this._photoAdded, keep(isImage, e.dataTransfer.files))
            that._addFile(e.dataTransfer.files);
        }

        function _copyDragoverFunction(e) {
            e.stopPropagation();
            e.preventDefault();
            e = e.originalEvent;
            e.dataTransfer.dropEffect = 'copy';
        }
    }

    UploadManager.prototype = {
        _addFile: function(listFile) {
            for (var file in listFile) {
                if (!isNaN(file)) {
                    var u = new UploadItem(this, listFile[file], file).init();
                    this.listUploadItem.push(u);

                    $(this.id)
                        .find('.' + this.getConstant().class_list)
                        .append(u.$el);
                }
            }
        },
        _renderFileItems: function() {
            //check list
            var that = this;
            this.storage
                .getAllAttachmentURLs(this.attachmentName)
                .then(function(urls) {
                    console.log(urls);
                    urls.forEach(function(f, i) {
                        that.storage
                            .getAttachment(that.attachmentName, f.attachKey)
                            .then(function(d) {
                                var u = new UploadItem(that, d, i).init();
                                that.listUploadItem.push(u);

                                $(that.id)
                                    .find('.' + that.getConstant().class_list)
                                    .append(u.$el);

                            })
                    })
                })



        }
    }

    var UploadItem = function(parentInstance, file, index) {

        this.file = file;
        this.indexFile = index;
        this.init = initFunction;
        this._uploadStart = _uploadStart

        this.BYTES_PER_CHUNK = 1048576;
        this.SIZE = file.size;
        this.NUM_CHUNKS = Math.max(Math.ceil(this.SIZE / this.BYTES_PER_CHUNK), 1);
        this.start = 0;
        this.end = this.BYTES_PER_CHUNK;
        this.slice_method = 'slice';
        this.url = '/upload/upload.php';
        this.uploaders = [];
        this.processTotal = 0;
        this.$elProcess = null;

        this.getSliceMethod = function() {
            if ('mozSlice' in this.file) {
                this.slice_method = 'mozSlice';
            } else if ('webkitSlice' in this.file) {
                this.slice_method = 'webkitSlice';
            } else {
                this.slice_method = 'slice';
            }
        }


        this.html_tmpl = [
            '<div class="file-item col-sm-4">',
            '<p><b class="file-name"></b></p>',
            '<p class="file-size"></p>',
            '<div class="progress">',
            '<div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;">',

            '</div>',
            '</div>',
            '<div><button class="btn btn-default btn-upload">Upload</button></div>',
            '</div>'
        ].join('');

        this.$el = null;

        var that = this;

        this.parentInstance = parentInstance;

        function initFunction() {

            that.parentInstance.storage
                .setAttachment(that.parentInstance.attachmentName, that.file.name, file);

            that.$el = $(that.html_tmpl);
            that.$el.find('.file-name').html(file.name)
            that.$el.find('.file-size').html((file.size / ( 1024 * 1024)).toFixed(1)+ 'MB')

            that.$el.find('.btn-upload')
                .click(that._uploadStart);

            that.$elProcess = that.$el.find('.progress-bar');

            return that;
        }

        function _uploadStart(e) {
            that.slice_method = that.getSliceMethod();
            var i = 0;
            while (that.start < that.SIZE) {
                that.uploadPerBlob(that.file.slice(that.start, that.end), i);
                // console.log(this.file.slice(this.start, this.end))
                that.start = that.end;
                that.end = that.start + that.BYTES_PER_CHUNK;
                i++;
            }
        }

        this.uploadPerBlob = function(blobOrFile, i) {

            var xhr = new XMLHttpRequest();
            xhr.open('POST', this.url, true);
            xhr.overrideMimeType('application/octet-stream');
            if (this.start !== 0) {
                xhr.setRequestHeader('Content-Range', 'bytes ' + this.start + '-' + this.end);
            }

            xhr.setRequestHeader('PART', i);
            xhr.setRequestHeader('KEY_NAME', this.file.name);
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
            
            
        }

        this.updateProcessBar = function() {
            var percent = (this.processTotal / this.NUM_CHUNKS) * 100;
            this.$elProcess.css({
                width: percent + '%',
            });
        }

        this.uploadSuccess = function() {
            // alert('upload success');
            this.parentInstance.storage
                .rmAttachment(this.parentInstance.attachmentName, this.file.name)
                .then(function(){
                    that.$el.fadeOut(2500);
                })

        }

        this.checkProcessUpload = function(index) {
            var flag = false;

            return flag;
        }

        return this;
    }

    return UploadManager;

})();
