define(["react", "app", "quill", "select2"], function (React, app, Quill, select2) {
    return React.createClass({
        getInitialState: function () {
            return {
                fromEmail: this.emailsender(),
                to: this.buildFieldsforSelect(app.user.get("draftMessageView")["meta"]["to"]),
                toCC: this.buildFieldsforSelect(app.user.get("draftMessageView")["meta"]["toCC"]),
                toBCC: this.buildFieldsforSelect(app.user.get("draftMessageView")["meta"]["toBCC"]),

                showCC: "",
                showBCC: "",
                showAtt: "",
                showPin: "",

                subject: app.user.get("draftMessageView")["meta"]["subject"],
                body: app.globalF.filterXSSwhite(app.user.get("draftMessageView")["body"]["html"]),

                manualSignature: app.user.get("draftMessageView")["meta"]["signatureOn"],
                emailAttachment: app.user.get("draftMessageView")["attachment"],
                fileObject: app.user.get("draftMessageView")["attachment"],
                fromOptions: this.fromField("from"),
                signature: app.globalF.filterXSSwhite(app.transform.from64str(this.fromField("sig"))),
                recipientLimit: app.user.get("userPlan")["planData"]["recipPerMail"],
                planRcptLimit: app.user.get("userPlan")["planData"]["recipPerMail"],
                contactArray: app.globalF.createContactFromSelect(),

                messageId: app.user.get("draftMessageView")["messageId"],
                sendingProgress: false,

                fileObjectNoData: {},
                prevFileObject: Object.keys(app.user.get("draftMessageView")["attachment"]),
                fileSize: this.getFilesize(app.user.get("draftMessageView")["attachment"]),
                emailProtected: -1,
                recipientList: [],

                enablePin: app.user.get("draftMessageView")["meta"]["pinEnabled"],
                pinText: app.user.get("draftMessageView")["meta"]["pin"],
                userPin: false,
                savingDraft: {},

                encryptionKey: "",
                changedHash: "",
                modKey: app.user.get("draftMessageView")["modKey"],
                messageId: app.user.get("draftMessageView")["messageId"],
                allEmails: {},
                uploadProgress: 0,
                uploadInterval: {},
                showUploadBar: "d-none",
                isMounted: app.globalF.generateStateRandomId(),

                oldPublicKeys: {},
                oldPublicKeysHash: "",
                sizeBarText: "",

                isMaximized: false,
                isMinimized: false
            };
        },
        buildFieldsforSelect: function (data) {
            var options = [];
            if (Object.keys(data).length > 0) {
                $.each(data, function (index, emailData) {
                    options.push(index);
                });
            }
            return options;
        },
        emailsender: function () {
            var sender = app.user.get("draftMessageView")["meta"]["from"];
            if (sender === "") {
                var keys = app.user.get("allKeys");
                $.each(keys, function (index, keyValue) {
                    if (keyValue["isDefault"]) {
                        sender = index;
                    }
                });
            }
            return sender;
        },
        fromField: function (action) {
            var thisComp = this;
            var keys = app.user.get("allKeys");
            var options = [];
            var from = this.state == undefined ? app.user.get("draftMessageView")["meta"]["from"] : this.state.fromEmail;

            var signature = "";
            var stateFrom = "";
            $.each(keys, function (index, keyValue) {
                var emailRaw = app.transform.from64str(keyValue["name"]) + " <" + app.transform.from64str(keyValue["email"]) + ">";
                var parsedEmail = app.globalF.parseEmail(emailRaw);

                if (keyValue["canSend"]) {
                    options.push(React.createElement(
                        "option",
                        { key: index, value: index },
                        parsedEmail["display"]
                    ));
                }
                if (from != "" && from == index && keyValue["includeSignature"]) {
                    signature = keyValue["signature"];
                } else if (from == "" && keyValue["isDefault"] && keyValue["includeSignature"]) {
                    signature = keyValue["signature"];
                }
            });

            if (action == "from") {
                return options;
            }
            if (action == "sig") {
                return signature;
            }
        },
        componentWillUnmount: function () {
            clearTimeout(this.state.savingDraft);
            app.globalF.resetDraftMessage();
            this.setState({ isMounted: "" });
            app.user.set({ emailReplyState: "" });
        },
        componentDidMount: function () {
            var thisComp = this;

            fileSelector = $("#fileselector");

            // Initiate editor toolbar [Quill]
            const quill = new Quill("#com-the-con-editor", {
                modules: {
                    toolbar: "#editor_toolbar"
                },
                handlers: {
                    link: function (value) {
                        if (value) {
                            const href = prompt("Enter the URL");
                            this.quill.format("link", href);
                        } else {
                            this.quill.format("link", false);
                        }
                    }
                }
            });

            thisComp.toSelect();
            thisComp.toCCSelect();
            thisComp.toBCCSelect();
            thisComp.attachFiles();

            $("#toRcpt").on("select2:selecting", function (e) {
                var limits = thisComp.countTotalRcpt();
                if (limits >= thisComp.state.planRcptLimit) {
                    app.notifications.systemMessage("rcptLimit");
                    e.preventDefault();
                }
            });
            $("#toRcpt").on("select2:select", function (e) {
                thisComp.checkRcpt();
                var element = e.params.data.element;
                var $element = $(element);

                $element.detach();
                $(this).append($element);
                $(this).trigger("change");
            });

            $("#toCCRcpt").on("select2:selecting", function (e) {
                var limits = thisComp.countTotalRcpt();
                if (limits >= thisComp.state.planRcptLimit) {
                    app.notifications.systemMessage("rcptLimit");
                    e.preventDefault();
                }
            });
            $("#toCCRcpt").on("select2:select", function (e) {
                thisComp.checkRcpt();
                var element = e.params.data.element;
                var $element = $(element);

                $element.detach();
                $(this).append($element);
                $(this).trigger("change");
            });

            $("#toBCCRcpt").on("select2:selecting", function (e) {
                var limits = thisComp.countTotalRcpt();
                if (limits >= thisComp.state.planRcptLimit) {
                    app.notifications.systemMessage("rcptLimit");
                    e.preventDefault();
                }
            });
            $("#toBCCRcpt").on("select2:select", function (e) {
                thisComp.checkRcpt();
                var element = e.params.data.element;
                var $element = $(element);

                $element.detach();
                $(this).append($element);
                $(this).trigger("change");
            });

            $("#atachFiles").on("select2:selecting", function (e) {
                e.preventDefault();
            });

            $("#atachFiles").on("select2:unselecting", function (e) {
                app.mixins.canNavigate(function (decision) {
                    if (decision) {
                        thisComp.fileRemove(e["params"]["args"]["data"]["id"], function () {});

                        e.preventDefault();
                    }
                });
            });

            $("#atachFiles").on("select2:select", function (e) {
                e.preventDefault();
                var element = e.params.data.element;
                var $element = $(element);

                $element.detach();
                $(this).append($element);
                $(this).trigger("change");
            });

            $("#toRcpt").on("select2:unselect", function (e) {
                // console.log('sdsdsd');
                thisComp.setState({
                    recipientLimit: thisComp.state.recipientLimit <= thisComp.state.planRcptLimit ? thisComp.state.planRcptLimit : thisComp.state.recipientLimit + 1
                });

                thisComp.checkRcpt();
            });
            $("#toCCRcpt").on("select2:unselect", function (e) {
                thisComp.setState({
                    recipientLimit: thisComp.state.recipientLimit <= thisComp.state.planRcptLimit ? thisComp.state.planRcptLimit : thisComp.state.recipientLimit + 1
                });
                thisComp.checkRcpt();
            });
            $("#toBCCRcpt").on("select2:unselect", function (e) {
                thisComp.setState({
                    recipientLimit: thisComp.state.recipientLimit <= thisComp.state.planRcptLimit ? thisComp.state.planRcptLimit : thisComp.state.recipientLimit + 1
                });
                thisComp.checkRcpt();
            });

            thisComp.setState({
                showCC: this.state.toCC.length == 0 ? "d-none" : "",
                showBCC: this.state.toBCC.length == 0 ? "d-none" : "",
                showAtt: Object.keys(this.state.emailAttachment).length == 0 ? "d-none" : "",
                showPin: !this.state.enablePin ? "d-none" : "",
                originalHash: thisComp.getEmailHash()
            });
            $("#toRcpt").val(this.state.to).trigger("change");
            $("#toCCRcpt").val(this.state.toCC).trigger("change");
            $("#toBCCRcpt").val(this.state.toBCC).trigger("change");
            $("#atachFiles").val(Object.keys(thisComp.state.fileObject)).trigger("change");

            var bodyContent = quill.clipboard.convert(thisComp.state.body);
            quill.setContents(bodyContent, "silent");

            this.setState({
                originalHash: this.getEmailHash()
                //body:this.state.signature
            });

            if (app.user.get("emailReplyState") == "reply") {
                quill.focus();
            } else if (app.user.get("emailReplyState") == "forward") {
                $("#toRcpt").select2("focus");
            } else if (app.user.get("emailReplyState") == "") {
                $("#toRcpt").select2("focus");
            }

            thisComp.draftSaveInterval();
        },
        toSelect: function () {
            var thisComp = this;
            $("#toRcpt").select2({
                debug: true,
                tags: true,
                data: thisComp.state.contactArray,
                placeholder: "Recipients can see each other emails. Maximum " + app.user.get("userPlan")["planData"]["recipPerMail"] + " recipients per mail",
                tokenSeparators: [";"],
                selectOnClose: true,
                minimumInputLength: 2,
                maximumInputLength: 250,
                maximumSelectionLength: thisComp.state.recipientLimit,
                language: {
                    maximumSelected: function () {
                        return "Your plan is limited to " + app.user.get("userPlan")["planData"]["recipPerMail"] + " recipients per email. Please upgrade plan to raise limit.";
                    },
                    inputTooShort: function () {
                        return "";
                    }
                },
                templateSelection: app.globalF.emailSelection,
                escapeMarkup: function (markup) {
                    return markup;
                }

                //templateResult:
            });
        },

        toCCSelect: function () {
            var thisComp = this;

            $("#toCCRcpt").select2({
                debug: true,
                tags: true,
                data: thisComp.state.contactArray,
                placeholder: "Recipient can see each other emails. Maximum " + app.user.get("userPlan")["planData"]["recipPerMail"] + " recipients per mail",
                tokenSeparators: [";"],
                minimumInputLength: 2,
                maximumInputLength: 250,
                maximumSelectionLength: thisComp.state.recipientLimit,
                language: {
                    maximumSelected: function () {
                        return "Your plan is limited to " + app.user.get("userPlan")["planData"]["recipPerMail"] + " recipients per email. Please upgrade plan to raise limit.";
                    },
                    inputTooShort: function () {
                        return "";
                    }
                },
                templateSelection: app.globalF.emailSelection,
                escapeMarkup: function (m) {
                    return m;
                }
            });
        },

        toBCCSelect: function () {
            var thisComp = this;

            $("#toBCCRcpt").select2({
                debug: true,
                tags: true,
                data: thisComp.state.contactArray,
                placeholder: "Recipient can not see each other emails. Maximum " + app.user.get("userPlan")["planData"]["recipPerMail"] + " recipients per mail",
                tokenSeparators: [";"],
                minimumInputLength: 2,
                maximumInputLength: 250,
                maximumSelectionLength: thisComp.state.recipientLimit,
                language: {
                    maximumSelected: function () {
                        return "Your plan is limited to " + app.user.get("userPlan")["planData"]["recipPerMail"] + " recipients per email. Please upgrade plan to raise limit.";
                    }
                },
                templateSelection: app.globalF.emailSelection,
                escapeMarkup: function (m) {
                    return m;
                }
            });
        },
        attachFiles: function () {
            var thisComp = this;

            $("#atachFiles").select2({
                tags: true,
                data: Object.keys(thisComp.state.fileObject),
                placeholder: "10 files max, not more than " + app.user.get("userPlan")["planData"]["attSize"] + " Mb total",
                tokenSeparators: ["/"],
                maximumSelectionLength: 10,
                formatSelectionTooBig: "Max of 10 files allowed.",
                language: {
                    maximumSelected: function () {
                        return "Your plan is limited to 10 files per email.";
                    },
                    noResults: function () {
                        return "Click on icon to select file";
                    }
                },
                templateSelection: app.globalF.fileSelection,
                escapeMarkup: function (m) {
                    return m;
                }
            });
        },
        getEmailHash: function () {
            var prehash = {
                from: this.state.fromEmail,
                to: this.checkRcpt()["allList"],
                subject: app.globalF.stripHTML(this.state.subject.substring(0, 150)),
                pin: this.state.pinText,
                pinEnabled: this.state.enablePin,
                body: $("#com-the-con-editor").html(),
                attachment: this.state.fileObject
            };

            return app.transform.SHA512(JSON.stringify(prehash));
        },
        countTotalRcpt: function () {
            var total = 0;
            var thisComp = this;

            var rcpt = $("#toRcpt").val();
            var ccRcpt = $("#toCCRcpt").val();
            var bccRcpt = $("#toBCCRcpt").val();

            if (rcpt != null) {
                total += rcpt.length;
            }
            if (ccRcpt != null) {
                total += ccRcpt.length;
            }
            if (bccRcpt != null) {
                total += bccRcpt.length;
            }

            return total;
        },
        checkRcpt: function (callback) {
            var total = 0;

            var allList = {
                to: {},
                cc: {},
                bcc: {},
                noDups: {}
            };
            var requestHashes = [];
            var allListWHash = {};

            var AllRecipients = {};
            var AllRecipientsByEmail = {};

            var AllRecipientsNoBcc = {};
            var AllRecipientsonlyBcc = {};

            var thisComp = this;

            var contacts = app.user.get("contacts");

            var rcpt = $("#toRcpt").val();
            var ccRcpt = $("#toCCRcpt").val();
            var bccRcpt = $("#toBCCRcpt").val();

            if (rcpt == null) {
                rcpt = [];
            } else {
                total += rcpt.length;

                $.each(rcpt, function (index, value) {
                    if (!app.transform.check64str(value)) {
                        var parsed = app.globalF.parseEmail(value);
                        var ind = app.transform.to64str(parsed["email"]);

                        allList["to"][ind] = {
                            name: app.transform.to64str(parsed["name"]),
                            dest: "to"
                        };
                        allList["noDups"][ind] = {
                            name: app.transform.to64str(parsed["name"]),
                            dest: "to"
                        };
                    } else {
                        allList["to"][value] = { name: "", dest: "to" };
                        allList["noDups"][value] = { name: "", dest: "to" };
                    }
                });
            }

            if (ccRcpt == null) {
                ccRcpt = [];
            } else {
                total += ccRcpt.length;

                $.each(ccRcpt, function (index, value) {
                    if (!app.transform.check64str(value)) {
                        var parsed = app.globalF.parseEmail(value);
                        var ind = app.transform.to64str(parsed["email"]);

                        allList["cc"][ind] = {
                            name: app.transform.to64str(parsed["name"]),
                            dest: "cc"
                        };
                        allList["noDups"][ind] = {
                            name: app.transform.to64str(parsed["name"]),
                            dest: "cc"
                        };
                    } else {
                        allList["cc"][value] = { name: "", dest: "cc" };
                        allList["noDups"][value] = { name: "", dest: "cc" };
                    }
                });
            }

            if (bccRcpt == null) {
                bccRcpt = [];
            } else {
                total += bccRcpt.length;

                $.each(bccRcpt, function (index, value) {
                    if (!app.transform.check64str(value)) {
                        var parsed = app.globalF.parseEmail(value);
                        var ind = app.transform.to64str(parsed["email"]);

                        allList["bcc"][ind] = {
                            name: app.transform.to64str(parsed["name"]),
                            dest: "bcc"
                        };
                        allList["noDups"][ind] = {
                            name: app.transform.to64str(parsed["name"]),
                            dest: "bcc"
                        };
                    } else {
                        allList["bcc"][value] = { name: "", dest: "bcc" };
                        allList["noDups"][value] = { name: "", dest: "bcc" };
                    }
                });
            }

            var dataResult = {
                total: total,
                allList: allList
            };

            if (Object.keys(allList["noDups"]).length > 0) {
                var pinEnabled = thisComp.state.enablePin;
                var pin = thisComp.state.pinText;

                $.each(allList["noDups"], function (email64, data) {
                    if (contacts[email64] != undefined) {
                        var ind = app.transform.SHA512(app.transform.from64str(email64));

                        AllRecipients[ind] = {
                            email: email64,
                            name: contacts[email64]["n"],
                            destination: data["dest"],
                            internal: false,
                            pin: pinEnabled ? pin : "",
                            publicKey: contacts[email64]["pgpOn"] === true ? contacts[email64]["pgp"] : ""
                        };
                        AllRecipientsByEmail[email64] = AllRecipients[ind];

                        requestHashes.push(ind);
                    } else {
                        var newCont = app.transform.from64str(email64);

                        AllRecipients[app.transform.SHA512(newCont)] = {
                            email: email64,
                            name: email64 != data["name"] ? data["name"] : "",
                            destination: data["dest"],
                            internal: false,
                            pin: pinEnabled ? pin : "",
                            publicKey: ""
                        };
                        AllRecipientsByEmail[email64] = AllRecipients[app.transform.SHA512(newCont)];
                        requestHashes.push(app.transform.SHA512(newCont));
                    }
                });
                var post = {
                    mails: JSON.stringify(requestHashes)
                };

                var newHash = app.transform.SHA256(JSON.stringify(requestHashes));
                if (newHash != thisComp.state.oldPublicKeysHash) {
                    app.serverCall.ajaxRequest("retrievePublicKeys", post, function (result) {
                        if (result["response"] == "success") {
                            $.each(result["data"], function (index, emailData) {
                                //allListWHash[index]['internal']=1;
                                AllRecipients[index]["internal"] = true;
                                AllRecipients[index]["v"] = emailData["v"];
                                AllRecipients[index]["publicKey"] = emailData["mailKey"];

                                AllRecipientsByEmail[AllRecipients[index]["email"]] = AllRecipients[index];
                            });

                            thisComp.setState({
                                oldPublicKeys: AllRecipientsByEmail,
                                oldPublicKeysHash: newHash,
                                allEmails: AllRecipientsByEmail
                            }, function () {
                                thisComp.verifyIfencrypted();
                                if (typeof callback !== "undefined") {
                                    callback(dataResult);
                                }
                            });
                        }
                    });
                    thisComp.setState({
                        oldPublicKeysHash: newHash
                    });
                } else {
                    AllRecipientsByEmail = thisComp.state.oldPublicKeys;
                    if (typeof callback !== "undefined") {
                        thisComp.verifyIfencrypted();
                        callback(dataResult);
                    }
                }
            } else {
                thisComp.setState({
                    //recipientList:allListWHash,
                    oldPublicKeysHash: "",
                    allEmails: {}
                }, function () {
                    thisComp.verifyIfencrypted();
                });
            }

            return dataResult;
        },
        getFileMeta: function (fileObject) {
            var tempObj = jQuery.extend(true, {}, this.state.fileObject);

            if (Object.keys(tempObj).length > 0) {
                $.each(tempObj, function (index, value) {
                    delete tempObj[index]["data"];
                });
            }

            return tempObj;
        },
        getFilesize: function (fileObject) {
            var fSize = 0;
            if (Object.keys(fileObject).length > 0) {
                $.each(fileObject, function (index, value) {
                    fSize += parseInt(app.transform.from64str(value["size"]));
                });
            }

            return fSize;
        },
        fileTag: function () {
            if (Object.keys(this.state.fileObject).length > 0) {
                $.each(this.state.fileObject, function (index, value) {
                    $("#file_" + app.transform.SHA1(index) + " >i").removeClass();
                    $("#file_" + app.transform.SHA1(index)).parent().addClass("file-uploaded");
                });
            }
        },

        readFile: function (event) {
            var thisComp = this;

            $.each($(event)[0].target.files, function (index, fileData) {
                var file = fileData;

                var fileObject = thisComp.state.fileObject;

                if (Object.keys(thisComp.state.fileObject).length <= 10 && thisComp.state.fileSize + file["size"] <= parseInt(app.user.get("userPlan")["planData"]["attSize"]) * 1024 * 1024 * 1.1) {
                    if (file["size"] < parseInt(app.user.get("userPlan")["planData"]["attSize"]) * 1024 * 1024 * 1.1) {
                        if (Object.keys(fileObject).indexOf(app.transform.to64str(file["name"])) == -1) {
                            app.user.set({
                                uploadInProgress: true
                            });

                            var reader = new FileReader();

                            reader.onload = function (e) {
                                var binary_string = "";
                                var bytes = new Uint8Array(reader.result);
                                for (var i = 0; i < bytes.byteLength; i++) {
                                    binary_string += String.fromCharCode(bytes[i]);
                                }

                                var fname = app.transform.to64str(file["name"]);
                                fileObject[fname] = {};

                                fileObject[fname]["base64"] = true;
                                fileObject[fname]["data"] = app.transform.to64bin(binary_string);
                                fileObject[fname]["name"] = app.transform.to64str(file["name"]);
                                fileObject[fname]["key"] = app.transform.to64bin(app.globalF.createEncryptionKey256());

                                fileObject[fname]["fileName"] = "toBeDetermenedAfterFileSave";
                                fileObject[fname]["size"] = app.transform.to64str(file["size"]);
                                fileObject[fname]["type"] = app.transform.to64str(file["type"]);
                                fileObject[fname]["modKey"] = app.globalF.makeModKey();
                                fileObject[fname]["v"] = 2;

                                var list = Object.keys(fileObject);

                                selectedValues = [];

                                $("#atachFiles").children().remove();

                                if (list.length > 0) {
                                    $.each(list, function (index, value) {
                                        $("#atachFiles").append('<option class="attached-files-list" value="' + value + '">' + app.transform.from64str(value) + "</option>");
                                        selectedValues.push(value);
                                    });
                                }
                                thisComp.handleClick("showAtt");

                                $("#atachFiles").val(selectedValues).trigger("change");

                                thisComp.fileUpload();
                            };

                            thisComp.setState({
                                uploadProgress: 15,
                                sizeBarText: "Encrypting File"
                            }, function () {
                                reader.readAsArrayBuffer(file);
                            });
                        }
                    } else {
                        app.notifications.systemMessage("tooBig");
                    }
                } else {
                    app.notifications.systemMessage("MaxFiles");
                }
            });

            $("#ddd").val("");
        },

        fileUpload: function () {
            clearInterval(this.state.savingDraft);

            var thisComp = this;

            var oldList = this.state.prevFileObject;
            var newList = this.state.fileObject;
            var fileList = {};

            $.each(newList, function (fName, fData) {
                if (oldList[fName] == undefined) {
                    fileList = {
                        index: fName,
                        modKey: fData["modKey"],
                        key: fData["key"]
                    };
                }
            });

            thisComp.setState({
                prevFileObject: Object.keys(newList),
                showUploadBar: ""
            });

            thisComp.prepareToSafeDraft("force", function () {
                thisComp.setState({
                    uploadProgress: 50,
                    sizeBarText: "Uploading File"
                });
                app.globalF.sendNewAttachment(newList, fileList, thisComp.state.messageId, thisComp.state.modKey, function (result) {
                    clearInterval(thisComp.state.uploadInterval);

                    if (result["response"] == "success") {
                        newList[fileList["index"]]["fileName"] = result["fileName"];
                        delete newList[fileList["index"]]["data"];

                        thisComp.setState({
                            uploadProgress: 100,
                            sizeBarText: "File Successfully Uploaded",
                            showUploadBar: "d-none"
                        });
                        app.user.set({
                            uploadInProgress: false
                        });

                        thisComp.addFileLink();

                        thisComp.prepareToSafeDraft("", function () {});

                        thisComp.setState({
                            fileSize: thisComp.getFilesize(newList)
                        });
                    } else if (result["fileSize"] == "overLimit") {
                        app.notifications.systemMessage("MaxFiles");
                        app.user.set({
                            uploadInProgress: false
                        });
                    } else {
                        app.user.set({
                            uploadInProgress: false
                        });

                        $("#file_" + app.transform.SHA1(fileList["index"]) + " >i").removeClass();
                        $("#file_" + app.transform.SHA1(fileList["index"])).parent().addClass("file-upload-failed");
                    }
                });
            });
        },

        addFileLink: function () {
            var time = new Date(new Date().setYear(new Date().getFullYear() + 1));

            if (this.state.emailProtected === 3 || this.state.emailProtected === 1) {
                $(".fileattach").remove();
            } else {
                $(".fileattach").remove();
                var linkbody = "<br/><div class='fileattach' style='background-color:#F2F2F2;'><span>Files will be available for download until " + time.toLocaleString() + "<br/><br/>";

                var fileObj = this.state.fileObject;
                var c = 1;
                $.each(fileObj, function (fName, fData) {
                    linkbody += '<div style="clear:both; margin-top:5px;">' + app.transform.from64str(fName) + ' <a href="' + app.defaults.get("domain") + "/api/dFV2/" + fData["fileName"] + "1/p/" + app.transform.bin2hex(app.transform.from64bin(fData["key"])) + '" target="_blank">Click to download file</a></div>';
                    c++;
                });

                linkbody += "</div>";

                if (Object.keys(fileObj).length > 0) {
                    $(linkbody).insertBefore(".emailsignature");

                    if ($(".emailsignature").length == 0) {
                        $(".note-editable").append(linkbody);
                    }
                }
            }
        },
        fileRemove: function (fileName64, callback) {
            clearInterval(this.state.savingDraft);
            var thisComp = this;
            var fileObject = thisComp.state.fileObject;
            var fileSize = thisComp.state.fileSize;

            var fileList = {
                fileName: fileObject[fileName64]["fileName"],
                modKey: fileObject[fileName64]["modKey"]
            };

            app.serverCall.ajaxRequest("removeFileFromDraft", fileList, function (result) {
                if (result["response"] == "success") {
                    delete fileObject[fileName64];

                    thisComp.setState({
                        fileSize: thisComp.getFilesize(fileObject),
                        prevFileObject: Object.keys(fileObject)
                    });

                    $("#atachFiles").children().remove();

                    selectedValues = [];

                    $("#atachFiles").children().remove();

                    if (Object.keys(fileObject).length > 0) {
                        $.each(Object.keys(fileObject), function (index, value) {
                            $("#atachFiles").append('<option value="' + value + '">' + app.transform.from64str(value) + "</option>");
                            selectedValues.push(value);
                        });
                    } else {
                        thisComp.setState({
                            showAtt: "d-none"
                        });
                    }
                    $("#atachFiles").val(selectedValues).trigger("change");
                    thisComp.addFileLink();
                    thisComp.fileTag();
                    thisComp.prepareToSafeDraft("", function () {});
                    callback();
                } else {
                    app.notifications.systemMessage("tryAgain");
                }
            });
        },
        verifyIfencrypted: function () {
            var thisComp = this;
            var AllRecipients = this.state.allEmails;
            var internals = {};
            var outsiders = {};
            var pin = this.state.pinText;
            var clearTexter = false;
            var pinProtected = false;
            var pgpProtected = false;
            var allRecip = $.Deferred();
            var protect = 0;

            if (Object.keys(AllRecipients).length > 0) {
                $.each(AllRecipients, function (index, rcpt) {
                    if (rcpt["internal"] === true) {
                        internals[index] = rcpt;
                    } else {
                        outsiders[index] = rcpt;
                    }
                    if (rcpt["internal"] === false && rcpt["publicKey"] == "" && (thisComp.state.enablePin === false || thisComp.state.pinText == "")) {
                        clearTexter = true;
                    }

                    if (rcpt["internal"] === false && rcpt["publicKey"] == "" && thisComp.state.enablePin === true && thisComp.state.pinText != "") {
                        pinProtected = true;
                    }

                    if (rcpt["internal"] === false && rcpt["publicKey"] != "") {
                        pgpProtected = true;
                    }
                });

                if (Object.keys(outsiders).length == 1 && this.state.enablePin === true && this.state.pinText == "" && !this.state.userPin) {
                    var contacts = app.user.get("contacts");
                    var index = Object.keys(outsiders)[0];
                    if (index != "") {
                        if (contacts[index] !== undefined) {
                            pin = app.transform.from64str(contacts[index]["p"]);
                        }

                        thisComp.setState({
                            pinText: pin,
                            userPin: true
                        }, function () {
                            thisComp.verifyIfencrypted();
                        });
                    }
                }

                if (Object.keys(outsiders).length > 1 && this.state.pinText != "" && this.state.userPin) {
                    pin = "";
                    thisComp.setState({
                        pinText: ""
                    });
                }

                var cc = Object.keys(AllRecipients).length;
                var out = Object.keys(outsiders).length;

                $.each(AllRecipients, function (index, emailData) {
                    var id = "." + app.transform.SHA256(app.transform.from64str(index));
                    var classSpan = "";
                    var classI = "";
                    if (clearTexter) {
                        classSpan = "email-unprotected";
                        classI = "fa fa-unlock";
                        protect = 0;
                    } else if (pinProtected) {
                        classSpan = "email-pinprotected";
                        classI = "fa fa-lock";
                        protect = 1;
                    } else if (pgpProtected) {
                        classSpan = "email-pgpprotected";
                        classI = "fa fa-lock";
                        protect = 2;
                    } else if (out == 0) {
                        classSpan = "email-protected";
                        classI = "fa fa-lock";
                        protect = 3;
                    }

                    $(id).parent().removeClass("email-protect email-unprotected email-pinprotected email-pgpprotected").addClass(classSpan);
                    $(id + ">i").removeClass().addClass(classI);

                    cc--;
                    if (cc === 0) {
                        allRecip.resolve();
                    }
                });
            } else {
                thisComp.setState({
                    emailProtected: -1
                });
            }

            allRecip.done(function () {
                thisComp.setState({
                    emailProtected: protect
                }, function () {
                    thisComp.addFileLink();
                });
            });
        },
        addFileLink: function () {
            var time = new Date(new Date().setYear(new Date().getFullYear() + 1));

            if (this.state.emailProtected === 3 || this.state.emailProtected === 1) {
                $(".fileattach").remove();
            } else {
                $(".fileattach").remove();
                var linkbody = "<br/><div class='fileattach' style='background-color:#F2F2F2;'><span>Files will be available for download until " + time.toLocaleString() + "<br/><br/>";

                var fileObj = this.state.fileObject;
                //console.log(fileObj);
                var c = 1;
                $.each(fileObj, function (fName, fData) {
                    linkbody += '<div style="clear:both; margin-top:5px;">' + app.transform.from64str(fName) + ' <a href="' + app.defaults.get("domain") + "/api/dFV2/" + fData["fileName"] + "1/p/" + app.transform.bin2hex(app.transform.from64bin(fData["key"])) + '" target="_blank">Click to download file</a></div>';
                    c++;
                });

                linkbody += "</div>";

                if (Object.keys(fileObj).length > 0) {
                    $(linkbody).insertBefore(".emailsignature");

                    if ($(".emailsignature").length == 0) {
                        $(".note-editable").append(linkbody);
                    }
                }
            }
        },
        prepareToSafeDraft: function (action, callback) {
            var thisComp = this;
            var changedHash = this.getEmailHash();
            clearInterval(this.state.savingDraft);

            if (this.state.originalHash != changedHash || action == "force") {
                //console.log('changed');

                this.setState({
                    originalHash: changedHash
                    //messageUnsaved:""
                });

                var d = new Date();

                var draft = {
                    meta: {},
                    attachment: {},
                    body: {}
                };

                draft["messageId"] = thisComp.state.messageId;

                draft["body"] = {
                    text: app.transform.to64str(app.globalF.stripHTML($("#com-the-con-editor .ql-editor:first-child").html())),
                    html: app.transform.to64str(app.globalF.filterXSSwhite($("#com-the-con-editor .ql-editor:first-child").html()))
                };
                draft["meta"]["from"] = $("#fromSender").val();
                draft["meta"]["to"] = this.checkRcpt()["allList"]["to"];
                draft["meta"]["toCC"] = this.checkRcpt()["allList"]["cc"];
                draft["meta"]["toBCC"] = this.checkRcpt()["allList"]["bcc"];

                draft["meta"]["attachment"] = Object.keys(this.state.fileObject).length > 0 ? 1 : 0;
                draft["meta"]["body"] = app.transform.to64str(app.globalF.stripHTML($("#com-the-con-editor .ql-editor:first-child").html()).substring(0, 50));
                draft["meta"]["opened"] = true;
                draft["meta"]["pin"] = app.transform.to64str(thisComp.state.pinText);
                draft["meta"]["pinEnabled"] = thisComp.state.enablePin;
                draft["meta"]["status"] = "normal";
                draft["meta"]["subject"] = app.transform.to64str(app.globalF.stripHTML(thisComp.state.subject.substring(0, 150)));
                draft["meta"]["timeSent"] = Math.round(d.getTime() / 1000);
                draft["meta"]["timeCreated"] = draft["messageId"] == "" ? Math.round(d.getTime() / 1000) : draft["meta"]["timeCreated"];
                draft["meta"]["timeUpdated"] = Math.round(d.getTime() / 1000);
                draft["meta"]["signatureOn"] = true;

                draft["meta"]["type"] = 3;
                draft["meta"]["version"] = 2;

                draft["meta"]["modKey"] = thisComp.state.modKey;
                draft["meta"]["pinTop"] = draft["meta"]["timeSent"];

                draft["attachment"] = thisComp.getFileMeta(thisComp.state.fileObject);
                draft["size"] = JSON.stringify(draft["meta"]).length + JSON.stringify(draft["body"]).length + thisComp.getFilesize(this.state.fileObject);
                draft["modKey"] = thisComp.state.modKey;

                app.globalF.saveDraft(draft, thisComp.state.isMounted, function (result, uniqDraftId) {
                    if (thisComp.state.isMounted === uniqDraftId) {
                        thisComp.setState({
                            messageId: result["messageId"],
                            modKey: result["modKey"]
                        }, function () {
                            app.globalF.syncUpdates();

                            callback();
                        });
                    }

                    //
                });

                thisComp.draftSaveInterval();
            } else {
                thisComp.draftSaveInterval();
                callback();
            }
        },
        draftSaveInterval: function () {
            clearInterval(this.state.savingDraft);
            var thisComp = this;
            var setDraftSafe = setInterval(function () {
                thisComp.prepareToSafeDraft("", function () {});
            }, 5000);
            thisComp.setState({
                savingDraft: setDraftSafe
            });
        },
        handleChange: function (i, event) {
            switch (i) {
                case "fromSelecting":
                    var thisComp = this;
                    thisComp.setState({
                        fromEmail: event.target.value
                    }, function () {
                        thisComp.setState({
                            signature: app.globalF.filterXSSwhite(app.transform.from64str(this.fromField("sig")))
                        });
                    });

                    break;
                case "enterSubject":
                    var thisComp = this;
                    thisComp.setState({
                        subject: event.target.value
                    });
                    break;
                case "enterPinText":
                    var thisComp = this;
                    thisComp.setState({
                        pinText: event.target.value,
                        userPin: false
                    }, function () {
                        thisComp.verifyIfencrypted();
                    });
                    break;
                case "getFile":
                    this.setState({
                        uploadProgress: 15,
                        sizeBarText: "Reading File"
                    });

                    this.readFile(event);
                    break;
            }
        },
        handleClick: function (i) {
            switch (i) {
                case "showCC":
                    this.setState({
                        showCC: this.state.showCC === "d-none" ? "" : "d-none"
                    });
                    break;
                case "showBCC":
                    this.setState({
                        showBCC: this.state.showBCC === "d-none" ? "" : "d-none"
                    });
                    break;
                case "showPin":
                    this.setState({
                        showPin: this.state.showPin === "d-none" ? "" : "d-none"
                    });
                    break;
                case "attachFile":
                    fileSelector.click();
                    break;
                case "showAtt":
                    this.setState({
                        showAtt: ""
                    });
                    break;
                case "sendEmail":
                    var thisComp = this;
                    //preparation to send email
                    /*
                        1)stop draft saving
                        2)gather all infor for email
                        3)detect recipients protection level
                        4)encrypt email
                        5)send out
                        6)close email
                         */

                    thisComp.setState({
                        sendingProgress: true
                    });

                    var saveDraft = $.Deferred();

                    thisComp.prepareToSafeDraft("force", function () {
                        // console.log('resolved');
                        saveDraft.resolve();
                    });

                    if (thisComp.checkRcpt()["total"] > 0) {
                        saveDraft.done(function () {
                            clearInterval(thisComp.state.savingDraft);

                            var d = new Date();

                            var draft = {
                                body: {},
                                meta: {}
                            };

                            draft["body"] = {
                                text: app.transform.to64str(app.globalF.stripHTML($("#com-the-con-editor .ql-editor:first-child").html())),
                                html: app.transform.to64str(app.globalF.filterXSSwhite($("#com-the-con-editor .ql-editor:first-child").html()))
                            };

                            draft["meta"]["from"] = app.user.get("allKeys")[$("#fromSender").val()]["displayName"];
                            draft["meta"]["to"] = thisComp.checkRcpt()["allList"]["to"];
                            draft["meta"]["toCC"] = thisComp.checkRcpt()["allList"]["cc"];
                            draft["meta"]["toBCC"] = thisComp.checkRcpt()["allList"]["bcc"];

                            draft["meta"]["attachment"] = 0;
                            draft["meta"]["body"] = app.transform.to64str(app.globalF.stripHTML($("#com-the-con-editor .ql-editor:first-child").html()).substring(0, 50));
                            draft["meta"]["opened"] = true;
                            draft["meta"]["pin"] = app.transform.to64str(thisComp.state.pinText);
                            draft["meta"]["pinEnabled"] = thisComp.state.enablePin;
                            draft["meta"]["status"] = "normal";
                            draft["meta"]["subject"] = app.transform.to64str(app.globalF.stripHTML(thisComp.state.subject.substring(0, 150)));
                            draft["meta"]["timeSent"] = Math.round(d.getTime() / 1000);
                            draft["meta"]["timeCreated"] = draft["messageId"] == "" ? Math.round(d.getTime() / 1000) : draft["meta"]["timeCreated"];
                            draft["meta"]["timeUpdated"] = Math.round(d.getTime() / 1000);
                            draft["meta"]["signatureOn"] = true;

                            draft["meta"]["type"] = 3;
                            draft["meta"]["version"] = 2;
                            draft["meta"]["pinTop"] = draft["meta"]["timeSent"];

                            draft["attachment"] = jQuery.extend(true, {}, thisComp.state.fileObject);

                            thisComp.checkRcpt(function (result) {
                                app.globalF.prepareForSending(draft, thisComp.state.allEmails, result, thisComp.state.emailProtected, thisComp.state.messageId, thisComp.state.pinText).then(function (response) {
                                    app.globalF.syncUpdates();
                                    app.globalF.resetCurrentMessage();
                                    app.globalF.resetDraftMessage();

                                    app.user.set({
                                        isDecryptingEmail: false
                                    });

                                    // Backbone.history.navigate(
                                    //     "/mail/" +
                                    //         app.user.get("currentFolder"),
                                    //     {
                                    //         trigger: true,
                                    //     }
                                    // );
                                    app.layout.display("viewBox");
                                    app.user.set({
                                        isComposingEmail: false
                                    });
                                    Backbone.history.loadUrl(Backbone.history.fragment);
                                }).fail(function (error) {
                                    //  console.log(error);
                                    var emailId = thisComp.state.messageId;
                                    var messages = app.user.get("emails")["messages"];
                                    var origFolder = app.user.get("systemFolders")["draftFolderId"];
                                    messages[emailId]["tp"] = 3;

                                    app.globalF.move2Folder(origFolder, [emailId], function () {
                                        if (error["data"] != "email2often") {
                                            app.notifications.systemMessage("tryAgain");
                                        } else if (error["data"] == "email2often") {
                                            app.notifications.systemMessage("email2often");
                                        } else if (error["data"] == "attachmentError") {
                                            app.notifications.systemMessage("reuploadAttachm");
                                        }
                                    });

                                    thisComp.setState({
                                        sendingProgress: false
                                    });
                                });
                            });
                        });
                    } else {
                        thisComp.setState({
                            sendingProgress: false
                        });
                        app.notifications.systemMessage("noRecpnts");
                    }

                    break;
                case "closeCompose":
                    app.user.set({ isComposingEmail: false });
                    app.user.set({ isDraftOpened: false });
                    $("body").removeClass("draft-opened");
                    $("#appRightSide").css("display", "none");
                    Backbone.history.loadUrl(Backbone.history.fragment);
                    break;
                case "deleteDraft":
                    app.user.set({ isComposingEmail: false });
                    app.user.set({ isDraftOpened: false });
                    $("body").removeClass("draft-opened");
                    $("#appRightSide").css("display", "none");
                    if (this.state.messageId == "") {
                        Backbone.history.navigate("/mail/" + app.user.get("currentFolder"), {
                            trigger: true
                        });
                        Backbone.history.loadUrl(Backbone.history.fragment);
                    } else {
                        var thisComp = this;

                        if (Object.keys(thisComp.state.fileObject).length > 0) {
                            $.each(thisComp.state.fileObject, function (index, data) {
                                thisComp.fileRemove(index, function () {
                                    var selected = [];
                                    selected.push(thisComp.state.messageId);
                                    // console.log(selected);

                                    if (selected.length > 0) {
                                        //delete email physically;
                                        app.globalF.resetCurrentMessage();
                                        app.globalF.resetDraftMessage();

                                        app.globalF.deleteEmailsFromFolder(selected, function (emails2Delete) {
                                            //console.log(emails2Delete);
                                            if (emails2Delete.length > 0) {
                                                app.userObjects.updateObjects("deleteEmail", emails2Delete, function (result) {
                                                    app.globalF.syncUpdates();
                                                    Backbone.history.navigate("/mail/" + app.user.get("currentFolder"), {
                                                        trigger: true
                                                    });
                                                    Backbone.history.loadUrl(Backbone.history.fragment);
                                                });
                                            }
                                        });
                                    }
                                });
                            });
                        } else {
                            var selected = [];
                            selected.push(thisComp.state.messageId);
                            if (selected.length > 0) {
                                app.globalF.resetCurrentMessage();
                                app.globalF.resetDraftMessage();

                                app.globalF.deleteEmailsFromFolder(selected, function (emails2Delete) {
                                    //console.log(emails2Delete);
                                    if (emails2Delete.length > 0) {
                                        app.userObjects.updateObjects("deleteEmail", emails2Delete, function (result) {
                                            app.globalF.syncUpdates();

                                            Backbone.history.navigate("/mail/" + app.user.get("currentFolder"), {
                                                trigger: true
                                            });
                                            Backbone.history.loadUrl(Backbone.history.fragment);
                                        });
                                    }
                                });
                            }
                        }

                        //console.log(thisComp.state.fileObject);
                        //this.fileRemove(fileName64);
                    }

                    // Backbone.history.loadUrl(Backbone.history.fragment);

                    break;
            }
        },
        handleEmailHeaderAction: function (i) {
            switch (i) {
                case "maximize":
                    this.setState({
                        isMaximized: this.state.isMaximized ? false : true,
                        isMinimized: false
                    });
                    break;
                case "minimize":
                    this.setState({
                        isMaximized: false,
                        isMinimized: this.state.isMinimized ? false : true
                    });
                    break;
            }
        },
        render: function () {
            var sizeBar = { width: this.state.uploadProgress + "%" };
            var sizeBarText = this.state.sizeBarText + " " + this.state.uploadProgress + "%";
            return React.createElement(
                "div",
                {
                    className: `compose-email-wrapper ${this.state.isMaximized ? "compose-maximize" : this.state.isMinimized ? "compose-minimize" : ""}`
                },
                React.createElement("input", {
                    type: "file",
                    id: "fileselector",
                    name: "files",
                    className: "invisible",
                    onChange: this.handleChange.bind(this, "getFile")
                }),
                React.createElement(
                    "div",
                    { className: "compose-ec" },
                    React.createElement(
                        "div",
                        { className: "the-header" },
                        React.createElement(
                            "div",
                            { className: "c-title" },
                            React.createElement(
                                "h3",
                                null,
                                "New message"
                            )
                        ),
                        React.createElement(
                            "div",
                            { className: "c-actions" },
                            React.createElement(
                                "button",
                                {
                                    type: "button",
                                    onClick: this.handleEmailHeaderAction.bind(this, "minimize")
                                },
                                React.createElement(
                                    "span",
                                    {
                                        className: `icon ${this.state.isMinimized ? "d-none" : ""}`
                                    },
                                    React.createElement(
                                        "svg",
                                        {
                                            viewBox: "0 0 48 48",
                                            xmlns: "http://www.w3.org/2000/svg"
                                        },
                                        React.createElement("path", { d: "M12 41.5v-3h24.05v3Z" })
                                    )
                                ),
                                React.createElement(
                                    "span",
                                    {
                                        className: `icon ${this.state.isMinimized ? "d-block" : "d-none"}`
                                    },
                                    React.createElement(
                                        "svg",
                                        {
                                            viewBox: "0 0 48 48",
                                            xmlns: "http://www.w3.org/2000/svg"
                                        },
                                        React.createElement("path", { d: "M5.95 9.5v-3H42v3Z" })
                                    )
                                )
                            ),
                            React.createElement(
                                "button",
                                {
                                    type: "button",
                                    onClick: this.handleEmailHeaderAction.bind(this, "maximize")
                                },
                                React.createElement(
                                    "span",
                                    {
                                        className: `icon type-max-min ${this.state.isMaximized ? "d-none" : ""}`
                                    },
                                    React.createElement(
                                        "svg",
                                        {
                                            viewBox: "0 0 48 48",
                                            xmlns: "http://www.w3.org/2000/svg"
                                        },
                                        React.createElement("path", { d: "M6 42V27h3v9.9L36.9 9H27V6h15v15h-3v-9.9L11.1 39H21v3Z" })
                                    )
                                ),
                                React.createElement(
                                    "span",
                                    {
                                        className: `icon type-max-min ${this.state.isMaximized ? "d-block" : "d-none"}`
                                    },
                                    React.createElement(
                                        "svg",
                                        {
                                            viewBox: "0 0 48 48",
                                            xmlns: "http://www.w3.org/2000/svg"
                                        },
                                        React.createElement("path", { d: "M8.1 42 6 39.9l10.7-10.7h-5.9v-3h11v11h-3v-5.9Zm18.15-20.25v-11h3v5.9L39.9 6 42 8.1 31.35 18.75h5.9v3Z" })
                                    )
                                )
                            ),
                            React.createElement(
                                "button",
                                {
                                    type: "button",
                                    onClick: this.handleClick.bind(this, "closeCompose"),
                                    disabled: this.state.sendingProgress
                                },
                                React.createElement(
                                    "span",
                                    { className: "icon" },
                                    React.createElement(
                                        "svg",
                                        {
                                            viewBox: "0 0 48 48",
                                            xmlns: "http://www.w3.org/2000/svg"
                                        },
                                        React.createElement("path", { d: "m12.45 37.65-2.1-2.1L21.9 24 10.35 12.45l2.1-2.1L24 21.9l11.55-11.55 2.1 2.1L26.1 24l11.55 11.55-2.1 2.1L24 26.1Z" })
                                    )
                                )
                            )
                        )
                    ),
                    React.createElement(
                        "div",
                        { className: "the-content" },
                        React.createElement(
                            "div",
                            { className: "the-content-wrapper" },
                            React.createElement(
                                "div",
                                { className: "com-content-header" },
                                React.createElement(
                                    "div",
                                    { className: "he-header-wrap" },
                                    React.createElement(
                                        "div",
                                        { className: "he-item" },
                                        React.createElement(
                                            "span",
                                            { className: "he-label" },
                                            "From:"
                                        ),
                                        React.createElement(
                                            "div",
                                            { className: "inputs-wrap" },
                                            React.createElement(
                                                "select",
                                                {
                                                    id: "fromSender",
                                                    value: this.state.fromEmail,
                                                    onChange: this.handleChange.bind(this, "fromSelecting")
                                                },
                                                this.state.fromOptions
                                            ),
                                            React.createElement(
                                                "div",
                                                { className: "com-cc-bcc-buttons" },
                                                React.createElement(
                                                    "button",
                                                    {
                                                        type: "button",
                                                        onClick: this.handleClick.bind(this, "showCC")
                                                    },
                                                    "Cc"
                                                ),
                                                React.createElement(
                                                    "button",
                                                    {
                                                        type: "button",
                                                        onClick: this.handleClick.bind(this, "showBCC")
                                                    },
                                                    "Bcc"
                                                ),
                                                React.createElement(
                                                    "button",
                                                    {
                                                        type: "button",
                                                        onClick: this.handleClick.bind(this, "showPin")
                                                    },
                                                    "PIN"
                                                )
                                            )
                                        )
                                    ),
                                    React.createElement(
                                        "div",
                                        { className: `he-item` },
                                        React.createElement(
                                            "span",
                                            { className: "he-label" },
                                            "To:"
                                        ),
                                        React.createElement(
                                            "div",
                                            { className: "inputs-wrap" },
                                            React.createElement("select", {
                                                className: "form-control",
                                                id: "toRcpt",
                                                multiple: "multiple"
                                            })
                                        )
                                    ),
                                    React.createElement(
                                        "div",
                                        {
                                            className: `he-item ${this.state.showCC}`
                                        },
                                        React.createElement(
                                            "span",
                                            { className: "he-label" },
                                            "CC:"
                                        ),
                                        React.createElement(
                                            "div",
                                            { className: "inputs-wrap" },
                                            React.createElement("select", {
                                                className: "form-control",
                                                id: "toCCRcpt",
                                                multiple: "multiple"
                                            })
                                        )
                                    ),
                                    React.createElement(
                                        "div",
                                        {
                                            className: `he-item ${this.state.showBCC}`
                                        },
                                        React.createElement(
                                            "span",
                                            { className: "he-label" },
                                            "BCC:"
                                        ),
                                        React.createElement(
                                            "div",
                                            { className: "inputs-wrap" },
                                            React.createElement("select", {
                                                className: "form-control",
                                                id: "toBCCRcpt",
                                                multiple: "multiple"
                                            })
                                        )
                                    ),
                                    React.createElement(
                                        "div",
                                        {
                                            className: `he-item ${this.state.showAtt}`
                                        },
                                        React.createElement(
                                            "span",
                                            { className: "he-label" },
                                            React.createElement(
                                                "span",
                                                { className: "the-icon" },
                                                React.createElement(
                                                    "svg",
                                                    {
                                                        xmlns: "http://www.w3.org/2000/svg",
                                                        fill: "none",
                                                        viewBox: "0 0 24 24",
                                                        strokeWidth: 1.5,
                                                        stroke: "currentColor"
                                                    },
                                                    React.createElement("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        d: "M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                                                    })
                                                )
                                            )
                                        ),
                                        React.createElement(
                                            "div",
                                            { className: "inputs-wrap" },
                                            React.createElement("select", {
                                                className: "form-control attachFiles",
                                                id: "atachFiles",
                                                multiple: "multiple"
                                            })
                                        )
                                    ),
                                    React.createElement(
                                        "div",
                                        {
                                            className: "modal-body he-item att-bar " + this.state.showUploadBar
                                        },
                                        React.createElement(
                                            "div",
                                            { className: "form-group" },
                                            React.createElement(
                                                "div",
                                                {
                                                    className: "bs-example",
                                                    "data-example-id": "progress-bar-with-label"
                                                },
                                                React.createElement(
                                                    "div",
                                                    { className: "progress" },
                                                    React.createElement(
                                                        "div",
                                                        {
                                                            className: "progress-bar",
                                                            role: "progressbar",
                                                            "aria-valuenow": "60",
                                                            "aria-valuemin": "0",
                                                            "aria-valuemax": "100",
                                                            style: sizeBar
                                                        },
                                                        sizeBarText,
                                                        " ",
                                                        React.createElement("i", { className: "fa fa-refresh fa-spin" })
                                                    )
                                                )
                                            )
                                        )
                                    ),
                                    React.createElement(
                                        "div",
                                        {
                                            className: `he-item ${this.state.showPin}`
                                        },
                                        React.createElement(
                                            "span",
                                            { className: "he-label" },
                                            "PIN:"
                                        ),
                                        React.createElement(
                                            "div",
                                            { className: "inputs-wrap" },
                                            React.createElement("input", {
                                                type: "text",
                                                className: "form-control",
                                                id: "pin",
                                                placeholder: "PIN",
                                                value: this.state.pinText,
                                                onChange: this.handleChange.bind(this, "enterPinText")
                                            })
                                        )
                                    ),
                                    React.createElement(
                                        "div",
                                        { className: "he-item" },
                                        React.createElement(
                                            "span",
                                            { className: "he-label" },
                                            "Subject:"
                                        ),
                                        React.createElement(
                                            "div",
                                            { className: "inputs-wrap" },
                                            React.createElement("input", {
                                                type: "text",
                                                className: "form-control",
                                                id: "subject",
                                                value: this.state.subject,
                                                onChange: this.handleChange.bind(this, "enterSubject")
                                            })
                                        )
                                    )
                                )
                            ),
                            React.createElement(
                                "div",
                                { className: "com-content-editor" },
                                React.createElement("div", {
                                    className: "com-the-con-editor",
                                    id: "com-the-con-editor"
                                }),
                                React.createElement("div", { id: "toolbar" }),
                                React.createElement(
                                    "div",
                                    { className: "c-editor-actions" },
                                    React.createElement(
                                        "div",
                                        {
                                            className: "c-editor-formating ql-formats",
                                            id: "editor_toolbar"
                                        },
                                        React.createElement(
                                            "button",
                                            {
                                                type: "submit",
                                                className: "ql-bold"
                                            },
                                            React.createElement(
                                                "span",
                                                { className: "icon" },
                                                React.createElement(
                                                    "svg",
                                                    {
                                                        xmlns: "http://www.w3.org/2000/svg",
                                                        viewBox: "0 0 48 48"
                                                    },
                                                    React.createElement("path", { d: "M14 36V8h11.4q3.3 0 5.725 2.1t2.425 5.3q0 1.9-1.05 3.5t-2.8 2.45v.3q2.15.7 3.475 2.5 1.325 1.8 1.325 4.05 0 3.4-2.625 5.6Q29.25 36 25.75 36Zm4.3-16.15h6.8q1.75 0 3.025-1.15t1.275-2.9q0-1.75-1.275-2.925Q26.85 11.7 25.1 11.7h-6.8Zm0 12.35h7.2q1.9 0 3.3-1.25t1.4-3.15q0-1.85-1.4-3.1t-3.3-1.25h-7.2Z" })
                                                )
                                            )
                                        ),
                                        React.createElement(
                                            "button",
                                            {
                                                type: "submit",
                                                className: "ql-italic"
                                            },
                                            React.createElement(
                                                "span",
                                                { className: "icon" },
                                                React.createElement(
                                                    "svg",
                                                    {
                                                        xmlns: "http://www.w3.org/2000/svg",
                                                        viewBox: "0 0 48 48"
                                                    },
                                                    React.createElement("path", { d: "M10 40v-5h6.85l8.9-22H18V8h20v5h-6.85l-8.9 22H30v5Z" })
                                                )
                                            )
                                        ),
                                        React.createElement(
                                            "button",
                                            {
                                                type: "submit",
                                                className: "ql-underline"
                                            },
                                            React.createElement(
                                                "span",
                                                { className: "icon" },
                                                React.createElement(
                                                    "svg",
                                                    {
                                                        xmlns: "http://www.w3.org/2000/svg",
                                                        viewBox: "0 0 48 48"
                                                    },
                                                    React.createElement("path", { d: "M10 42v-3h28v3Zm14-8q-5.05 0-8.525-3.45Q12 27.1 12 22.1V6h4v16.2q0 3.3 2.3 5.55T24 30q3.4 0 5.7-2.25Q32 25.5 32 22.2V6h4v16.1q0 5-3.475 8.45Q29.05 34 24 34Z" })
                                                )
                                            )
                                        ),
                                        React.createElement(
                                            "button",
                                            {
                                                type: "submit",
                                                className: "ql-blockquote"
                                            },
                                            React.createElement(
                                                "span",
                                                { className: "icon" },
                                                React.createElement(
                                                    "svg",
                                                    {
                                                        xmlns: "http://www.w3.org/2000/svg",
                                                        viewBox: "0 0 48 48"
                                                    },
                                                    React.createElement("path", { d: "M29 23h8v-8h-8Zm-18 0h8v-8h-8Zm20.3 11 4-8H26V12h14v14.4L36.2 34Zm-18 0 4-8H8V12h14v14.4L18.2 34ZM15 19Zm18 0Z" })
                                                )
                                            )
                                        ),
                                        React.createElement(
                                            "button",
                                            {
                                                type: "submit",
                                                className: "ql-list",
                                                value: "ordered"
                                            },
                                            React.createElement(
                                                "span",
                                                { className: "icon" },
                                                React.createElement(
                                                    "svg",
                                                    {
                                                        xmlns: "http://www.w3.org/2000/svg",
                                                        viewBox: "0 0 48 48"
                                                    },
                                                    React.createElement("path", { d: "M6 40v-1.7h4.2V37H8.1v-1.7h2.1V34H6v-1.7h5.9V40Zm10.45-2.45v-3H42v3ZM6 27.85v-1.6l3.75-4.4H6v-1.7h5.9v1.6l-3.8 4.4h3.8v1.7Zm10.45-2.45v-3H42v3ZM8.1 15.8V9.7H6V8h3.8v7.8Zm8.35-2.55v-3H42v3Z" })
                                                )
                                            )
                                        ),
                                        React.createElement(
                                            "button",
                                            {
                                                type: "submit",
                                                className: "ql-list",
                                                value: "bullet"
                                            },
                                            React.createElement(
                                                "span",
                                                { className: "icon" },
                                                React.createElement(
                                                    "svg",
                                                    {
                                                        xmlns: "http://www.w3.org/2000/svg",
                                                        viewBox: "0 0 48 48"
                                                    },
                                                    React.createElement("path", { d: "M8.55 39q-1.05 0-1.8-.725T6 36.55q0-1.05.75-1.8t1.8-.75q1 0 1.725.75.725.75.725 1.8 0 1-.725 1.725Q9.55 39 8.55 39ZM16 38v-3h26v3ZM8.55 26.5q-1.05 0-1.8-.725T6 24q0-1.05.75-1.775.75-.725 1.8-.725 1 0 1.725.75Q11 23 11 24t-.725 1.75q-.725.75-1.725.75Zm7.45-1v-3h26v3ZM8.5 14q-1.05 0-1.775-.725Q6 12.55 6 11.5q0-1.05.725-1.775Q7.45 9 8.5 9q1.05 0 1.775.725Q11 10.45 11 11.5q0 1.05-.725 1.775Q9.55 14 8.5 14Zm7.5-1v-3h26v3Z" })
                                                )
                                            )
                                        ),
                                        React.createElement(
                                            "button",
                                            {
                                                type: "submit",
                                                className: "ql-link"
                                            },
                                            React.createElement(
                                                "span",
                                                { className: "icon" },
                                                React.createElement(
                                                    "svg",
                                                    {
                                                        xmlns: "http://www.w3.org/2000/svg",
                                                        viewBox: "0 0 48 48"
                                                    },
                                                    React.createElement("path", { d: "M22.5 34H14q-4.15 0-7.075-2.925T4 24q0-4.15 2.925-7.075T14 14h8.5v3H14q-2.9 0-4.95 2.05Q7 21.1 7 24q0 2.9 2.05 4.95Q11.1 31 14 31h8.5Zm-6.25-8.5v-3h15.5v3ZM25.5 34v-3H34q2.9 0 4.95-2.05Q41 26.9 41 24q0-2.9-2.05-4.95Q36.9 17 34 17h-8.5v-3H34q4.15 0 7.075 2.925T44 24q0 4.15-2.925 7.075T34 34Z" })
                                                )
                                            )
                                        ),
                                        React.createElement(
                                            "button",
                                            {
                                                type: "submit",
                                                className: "ql-clean"
                                            },
                                            React.createElement(
                                                "span",
                                                { className: "icon" },
                                                React.createElement(
                                                    "svg",
                                                    {
                                                        xmlns: "http://www.w3.org/2000/svg",
                                                        viewBox: "0 0 48 48"
                                                    },
                                                    React.createElement("path", { d: "M25.35 21.8 21.5 18l1.2-2.8h-3.95l-5.2-5.2H40v5H28.25ZM40.3 45.2 22.85 27.7 18.45 38H13l6-14.1L2.8 7.7l2.1-2.1 37.5 37.5Z" })
                                                )
                                            )
                                        ),
                                        React.createElement(
                                            "button",
                                            {
                                                type: "button",
                                                onClick: this.handleClick.bind(this, "attachFile")
                                            },
                                            React.createElement(
                                                "span",
                                                { className: "icon" },
                                                React.createElement(
                                                    "svg",
                                                    {
                                                        xmlns: "http://www.w3.org/2000/svg",
                                                        viewBox: "0 0 24 24"
                                                    },
                                                    React.createElement("path", { d: "M21.586 10.461l-10.05 10.075c-1.95 1.949-5.122 1.949-7.071 0s-1.95-5.122 0-7.072l10.628-10.585c1.17-1.17 3.073-1.17 4.243 0 1.169 1.17 1.17 3.072 0 4.242l-8.507 8.464c-.39.39-1.024.39-1.414 0s-.39-1.024 0-1.414l7.093-7.05-1.415-1.414-7.093 7.049c-1.172 1.172-1.171 3.073 0 4.244s3.071 1.171 4.242 0l8.507-8.464c.977-.977 1.464-2.256 1.464-3.536 0-2.769-2.246-4.999-5-4.999-1.28 0-2.559.488-3.536 1.465l-10.627 10.583c-1.366 1.368-2.05 3.159-2.05 4.951 0 3.863 3.13 7 7 7 1.792 0 3.583-.684 4.95-2.05l10.05-10.075-1.414-1.414z" })
                                                )
                                            )
                                        )
                                    ),
                                    React.createElement(
                                        "div",
                                        { className: "c-editor-send-actions" },
                                        React.createElement(
                                            "button",
                                            {
                                                type: "submit",
                                                className: "delete-draft",
                                                onClick: this.handleClick.bind(this, "deleteDraft"),
                                                disabled: this.state.sendingProgress
                                            },
                                            React.createElement(
                                                "span",
                                                { className: "icon" },
                                                React.createElement(
                                                    "svg",
                                                    {
                                                        xmlns: "http://www.w3.org/2000/svg",
                                                        fill: "none",
                                                        viewBox: "0 0 24 24",
                                                        strokeWidth: 1.5
                                                    },
                                                    React.createElement("path", {
                                                        strokeLinecap: "round",
                                                        strokeLinejoin: "round",
                                                        d: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                                    })
                                                )
                                            )
                                        ),
                                        React.createElement(
                                            "button",
                                            {
                                                type: "submit",
                                                className: "send-email-button",
                                                disabled: this.state.sendingProgress,
                                                onClick: this.handleClick.bind(this, "sendEmail")
                                            },
                                            this.state.sendingProgress ? "Sending..." : "Send email"
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            );
        }
    });
});