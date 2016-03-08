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
            return _CONSTANT; }

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
            var html = '<div class="' + _CONSTANT.class_list + '"></div>';
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

                    var $tm = $(u.html_tmpl);
                    $tm.find('.file-name').html(u.file.name)
                    $tm.find('.file-size').html(u.file.size)
                    $(this.id)
                        .find('.' + this.getConstant().class_list)
                        .append($tm);
                }
            }
        },
        _renderFileItems: function() {
            //check list
            var that = this;
            this.storage
                .getAllAttachmentURLs(this.attachmentName)
                .then(function(urls) {
                    urls.forEach(function(f, i) {
                        that.storage
                            .getAttachment(that.attachmentName, f.attachKey)
                            .then(function(d) {
                                var u = new UploadItem(that, d, i).init();
                                that.listUploadItem.push(u);

                                var $tm = $(u.html_tmpl);
                                $tm.find('.file-name').html(u.file.name)
                                $tm.find('.file-size').html(u.file.size)
                                $(that.id)
                                    .find('.' + that.getConstant().class_list)
                                    .append($tm);

                            })
                    })
                })



        }
    }

    var UploadItem = function(parentInstance, file, index) {
        this.file = file;
        this.indexFile = index;
        this.init = initFunction;
        this.html_tmpl = [
            '<div class="file-item">',
            '<h3 class="file-name"></h3>',
            '<span class="file-size"></span>',
            '</div>'
        ].join('');

        var that = this;

        this.parentInstance = parentInstance;

        function initFunction() {
            console.log('init');
            that.parentInstance.storage
                .setAttachment(that.parentInstance.attachmentName, that.file.name, file);

            return that;
        }

        return this;
    }

    return UploadManager;

})();
