define(["react", "app", "cmpld/modals/paymentGate","ajaxQueue"], function (
    React,
    app,
    PaymentGate,
    ajaxQueue
) {
    return React.createClass({
        /**
         *
         * @returns {{compSafe: boolean, secondFactorInput: boolean, fac2Text: string, fac2Type: string}}
         */
        getInitialState: function () {
            return {
                email:app.defaults.get( "userName" ),
                newPass:app.defaults.get( "firstPassfield" ),
                compSafe: false,
                secondFactorInput: false,
                fac2Text: "",
                fac2Type: "",
                domainSelectFlag: false,
                incorrectCredentials: false,
                signDisabled:false,

                emailError: "",
                passError: "",

                pinWrong:false,
                domainList: ["@mailum.com","@cyberfear.com"],
                //domain:app.defaults.get( "defLogDomain" ),
                firstTimeUser: false,

                working: true,
                buttonTag: "",
                buttonText: "SIGN IN",
                inPasswordViewMode: false,
                domain: "",
                maintenanceMode: false,
            };
        },
        componentWillUnmount: function () {
        },

        componentDidMount: async function () {
            if (document.domain == "mailum3h3jwoeptq7p6wxoigqvc4m25kujxfybu7mud3uxkmebnphmad.onion") {
                app.defaults.set({
                    apidomain:
                        "http://mailum3h3jwoeptq7p6wxoigqvc4m25kujxfybu7mud3uxkmebnphmad.onion/api",
                });
            }
            try {
                let response = await fetch(
                    app.defaults.get("apidomain") + `/availableForRegistrationV3`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                        },
                    }
                );
                let data = await response.json();

                var domList = [];
                data.data.map((x) => {
                    domList.push("@" + x.domain);
                    if (x.def2reg == "1") {
                        this.setState({ domain: "@" + x.domain });
                    }
                });
                this.setState({ domainList: domList });

                // Set working to false after data is loaded and state is updated
                this.setState({ working: false });
            } catch (error) {
                this.setState({ maintenanceMode: true });
                console.error("Error fetching domain list:", error);
                // Handle the error, possibly set a default domain or show an error message
                this.setState({ working: false });
            }

            if (app.defaults.get("dev") === true) {
                if (this.state.email != "") {
                    this.setState({
                        signDisabled: false,
                    });
                }
                // this.handleClick("login");
                // this.handleUserNameChange();
            }
            if (app.defaults.get("dev")) {
                this.handleClick("login", this);
            }
        },

        /**
         *
         * @param {string} action
         * @param {object} event
         */
        handleChange: function (action, event) {
            switch (action) {
                case "enter2FacText":
                    this.setState({
                        fac2Text: event.target.value,
                    });
                    break;
                case "email":
                    var email = event.target.value;
                    if (email.indexOf("@") !== -1) {
                        this.setState({
                            emailError:
                                "please enter only first part of email, without @",
                        });
                    } else if (email.length < 3) {
                        this.setState({
                            emailError: "minimum 3 character",
                            signDisabled:true
                        });
                    } else if (email.length > 250) {
                        this.setState({
                            emailError: "maximum 250 character",
                            signDisabled:true
                        });
                    } else {
                        this.setState({
                            emailError: "",
                            signDisabled:false
                        });
                    }

                    this.setState(
                        {
                            email: event.target.value,
                        },
                        function () {
                           // this.checkEmailTyping();
                        }
                    );

                    break;
                case "newPass":
                    var newPass = event.target.value;
                        this.setState({
                            passError: "",
                        });

                    this.setState({
                        newPass: newPass,
                    });
                    break;
                case "changeDomain":
                    this.setState({
                        domain:event.target.value
                    })
                    break;
            }
        },
        /**
         *
         * @param {string} action
         * @param {object} event
         */
        handleClick: function (action, event) {
            //app.user.set({id:10});
            // event.preventDefault();
            switch (action) {
                case "makePayment":
                    $("#loginUser").modal("hide");
                    break;

                case "openDB":
                    app.indexedDBWorker.showRecord("");

                    break;
                case "AddData":
                    app.indexedDBWorker.addData("", "");

                    break;

                case "DeleteStore":
                    app.indexedDBWorker.deleteStore("");
                    break;
                case "RemoveOldData":
                    app.indexedDBWorker.deleteRecord();

                    console.log(app.indexedDBWorker);
                    //var request = db.transaction(["user_1"], "readwrite")
                    //	.objectStore("user_1")
                    //	.delete(["777-44-4444"]);

                    //request.onsuccess = function(event) {
                    //	alert("Gone");
                    //};

                    break;

                case "login":
                  //  event.preventDefault();
                    if(!app.defaults.get("dev")){
                        event.preventDefault();
                    }

                    var thisComp = this;

                    if (thisComp.state.email.length>0 && thisComp.state.emailError=="" && thisComp.state.newPass.length>0) {
                        thisComp.setState({
                            working: true,
                            buttonTag: "fa fa-refresh fa-spin",
                            buttonText: "WORKING..",
                            incorrectCredentials: false
                        });

                        var email =thisComp.state.email.toLowerCase()+thisComp.state.domain.toLowerCase();
                        var password = thisComp.state.newPass;
                        var factor2 = this.state.fac2Text;

                        app.indexedDBWorker.set({
                            allowedToUse: $("#computerSafe").is(":checked"),
                        });
                        //app.userObjects.retrieveUserObject();

                        app.auth.Login(
                            email,
                            password,
                            factor2,
                            function (result) {
                                //console.log(result);
                                thisComp.setState({
                                    working: false,
                                    buttonTag: "",
                                    buttonText: "SIGN IN",
                                });

                                if (result == "firstTime") {
                                    thisComp.setState({
                                        firstTimeUser: true,
                                    });
                                }
                                if (result == "wrngUsrOrPass") {
                                    thisComp.setState({
                                        incorrectCredentials: true,
                                        fac2Type: "",
                                    });
                                }
                                if (result == "needGoogle") {
                                    thisComp.setState({
                                        secondFactorInput: true,
                                    });

                                    thisComp.setState({
                                        fac2Type: 1,
                                    });
                                }
                                if (result == "needYubi") {
                                    thisComp.setState({
                                        secondFactorInput: true,
                                        fac2Type: 2
                                    });
                                }
                                if(result=='noinet'){
                                    $.ajaxQueue.clear();
                                    /*thisComp.setState({
                                        working: false,
                                        buttonTag: "",
                                        buttonText: "SIGN IN",
                                    });*/
                                }
                                if(result=="pinWrong"){
                                    thisComp.setState({
                                        pinWrong: true,
                                    });

                                }
                                if(result=="fail"){
                                    thisComp.setState({
                                        incorrectCredentials: true,
                                        secondFactorInput: false,
                                    });
                                   console.log('result111');
                                    console.log(result);
                                }
                            }
                        );
                    }
                    break;
                case "enterLogin":
                    if (event.keyCode == 13) {
                        event.preventDefault();
                        this.handleClick("login", event);
                    }
                    break;
                case "forgotPassword":
                    Backbone.history.navigate("forgotPassword", {
                        trigger: true,
                    });
                    $("#loginUser").modal("hide");
                    $("#forgPass-modal").modal("show");

                    break;
            }
        },
        handleUserNameChange: function (event) {
            const _userNameVal = event.target.value;
            var thisComp = this;
            if (_userNameVal.indexOf("@") > 0) {
                thisComp.setState({
                    domainSelectFlag: true,
                });
            } else {
                thisComp.setState({
                    domainSelectFlag: false,
                });
            }
        },
        handlePasswordView: function (event) {
            //event.preventDefault();
            let _inPasswordViewMode = false;
            if (this.state.inPasswordViewMode) {
                $("#LoginUser_password").prop("type", "password");
                _inPasswordViewMode = false;
            } else {
                $("#LoginUser_password").prop("type", "text");
                _inPasswordViewMode = true;
            }
            this.setState({
                inPasswordViewMode: _inPasswordViewMode,
            });
        },
        render: function () {
            var styleYes = {
                color: "#006600",
            };
            var styleNA = {
                color: "#aaaa00",
            };

            var overflow = {
                overflow: "hidden",
            };

            const maintenanceContent = (
              <div className="maintenance-message">
                <h1>Maintenance</h1>
                <div className="welcome-text">
                  Our site is currently undergoing maintenance.
                </div>
                <p
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    marginTop: '10px',
                  }}
                >
                  We apologize for any inconvenience and appreciate your patience.
                  <br />
                  Please check back in a few minutes.
                </p>
              </div>
            );
            const originalContent = (
                <div>
                    <div
                        className={`loading-screen welcome ${
                            this.state.working ? "d-flex" : "d-none"
                        }`}
                    >
                        <div className="t-animation is-loading page-login">
                            <div
                                className="
                                            loading-animation
                                            type-progress
                                            style-circle
                                        "
                            >
                                <div className="progress-circle medium">
                                    <div className="circle-bg">
                                        <img
                                            src="/images/loading-circle.svg"
                                            alt="loading-circle"
                                            style={{
                                                width: "91px",
                                                height: "91px",
                                            }}
                                        />
                                    </div>
                                    <div className="circle-content">
                                        <div className="loading-spinner">
                                            <div className="the-spinner">
                                                <div className="_bar1"></div>
                                                <div className="_bar2"></div>
                                                <div className="_bar3"></div>
                                                <div className="_bar4"></div>
                                                <div className="_bar5"></div>
                                                <div className="_bar6"></div>
                                                <div className="_bar7"></div>
                                                <div className="_bar8"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="progress-content">
                                    <h4>Welcome back!</h4>
                                    <p>Please wait a few seconds...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h1>Login</h1>
                        <div className="welcome-text">
                            Welcome back to <span>Mailum.</span>
                        </div>
                        <div className="form-section">
                            <div
                                id="loginUserForm"
                                onKeyDown={this.handleClick.bind(
                                    this,
                                    "enterLogin"
                                )}
                            >
                                <div className="row">
                                    <div className="col-sm-7">
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                className="form-control"
                                                name="email"
                                                id="LoginForm_username"
                                                placeholder="Email"
                                                autoComplete="username"
                                                value={this.state.email}
                                                onChange={this.handleChange.bind(
                                                    null,
                                                    "email"
                                                )}
                                            />
                                            <label
                                                className={
                                                    "control-label pull-left " +
                                                    (this.state
                                                        .emailError == ""
                                                        ? "hidden"
                                                        : "invalid-feedback")
                                                }
                                                htmlFor="LoginForm_username"
                                            >
                                                {this.state.emailError}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-sm-5">
                                        <div className="form-group">
                                            <select
                                                className="form-select"
                                                aria-label="Domain select"
                                                id="LoginForm_domain"
                                                disabled={
                                                    this.state.domainSelectFlag
                                                        ? true
                                                        : null
                                                }
                                                onChange={this.handleChange.bind(
                                                    null,
                                                    "changeDomain"
                                                )}
                                                defaultValue={this.state.domain}
                                                value={this.state.domain}
                                            >
                                                {this.state.domainList.map( (x,y) =>
                                                    <option key={y}>{x}</option> )}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-sm-12">
                                        <div className="form-group">
                                            <button
                                                tabIndex={"-1"}
                                                className={`form-icon ${
                                                    this.state
                                                        .inPasswordViewMode
                                                        ? "eye-close"
                                                        : "eye"
                                                }`}
                                                type="button"
                                                onClick={this.handlePasswordView}
                                            ></button>
                                            <input
                                                type="password"
                                                className="form-control with-icon"
                                                name="pP"
                                                autoComplete="current-password"
                                                id="LoginUser_password"
                                                placeholder="Password"
                                                onChange={this.handleChange.bind(
                                                    null,
                                                    "newPass"
                                                )}
                                                value={this.state.newPass}

                                            />
                                            <label
                                                className={
                                                    "control-label pull-left " +
                                                    (this.state
                                                        .passError == ""
                                                        ? "hidden"
                                                        : "invalid-feedback")
                                                }
                                                htmlFor="LoginUser_password"
                                            >
                                                {this.state.passError}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-sm-12">
                                        <div
                                            className={
                                                "form-group " +
                                                (this.state.fac2Type == 0
                                                    ? "d-none"
                                                    : "")
                                            }
                                        >
                                            <button className="form-icon bg-transparent">
                                                <span
                                                    className={
                                                        "mt-n1 " +
                                                        (this.state.fac2Type == 1 ? "": "d-none")
                                                    }
                                                >
                                                    <svg
                                                        fill="#000000"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 32 32"
                                                        width="20px"
                                                        height="20px"
                                                    >
                                                        <path d="M 18.683594 15.40625 C 18.683594 13.429688 21.894531 13.257813 21.894531 9.394531 C 21.894531 6.597656 19.949219 5.257813 19.75 5.136719 L 21.6875 5.136719 L 23.625 4 L 17.347656 4 C 10.960938 4 9.9375 8.46875 9.9375 9.949219 C 9.9375 12.15625 11.664063 14.898438 15.136719 14.898438 C 15.453125 14.898438 15.789063 14.878906 16.144531 14.839844 C 16.085938 15.003906 15.835938 15.566406 15.835938 16.074219 C 15.835938 17.136719 16.515625 17.8125 16.75 18.222656 C 12.949219 18.1875 8.375 19.835938 8.375 23.503906 C 8.375 24.84375 9.527344 28 14.941406 28 C 21.117188 28 22.988281 24.1875 22.988281 22.050781 C 22.984375 17.96875 18.683594 17.292969 18.683594 15.40625 Z M 16.585938 14.042969 C 14.425781 14.042969 12.601563 11.324219 12.601563 8.417969 C 12.601563 7.554688 13.015625 5.046875 15.40625 5.046875 C 18.484375 5.046875 19.234375 9.609375 19.234375 10.851563 C 19.234375 11.140625 19.4375 14.042969 16.585938 14.042969 Z M 16.4375 26.679688 C 14.457031 26.679688 11.039063 25.835938 11.039063 22.835938 C 11.039063 21.796875 11.644531 19.082031 16.902344 19.082031 C 17.171875 19.082031 17.40625 19.09375 17.605469 19.113281 C 18.699219 19.929688 20.964844 21.109375 20.964844 23.28125 C 20.964844 24.265625 20.378906 26.679688 16.4375 26.679688 Z" />
                                                    </svg>
                                                </span>
                                                <span
                                                    className={"mt-n1" + (this.state.fac2Type==2?"":"d-none")}
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="20"
                                                        height="20"
                                                        viewBox="0 0 64 64"
                                                    >
                                                        <path
                                                            d="M32.225 31.1l5.52-15.663h7.985l-13.46 33.126h-8.435l3.862-9.075-9.43-24.027h8.15z"
                                                            fill="#98c93c"
                                                        />
                                                        <circle
                                                            cx="32"
                                                            cy="32"
                                                            r="29.091"
                                                            fillOpacity="0"
                                                            stroke="#98c93c"
                                                            strokeWidth="5.818"
                                                        />
                                                    </svg>
                                                </span>
                                            </button>
                                            <input
                                                type="text"
                                                className="form-control input-lg"
                                                placeholder="PIN"
                                                value={this.state.fac2Text}
                                                onChange={this.handleChange.bind(
                                                    this,
                                                    "enter2FacText"
                                                )}
                                            />
                                        </div>
                                    </div>
                                    {this.state.incorrectCredentials || this.state.pinWrong? (
                                        <div className="col-sm-12">
                                            <div className="bg-danger px-4 py-2 rounded text-white text-center mb-2 fs-6">
                                                {this.state.incorrectCredentials?"Wrong username or password.":"Pin is incorrect"}
                                            </div>
                                        </div>
                                    ) : null}
                                    <div className="col-sm-12">
                                        <div className="forgot-link">
                                            <a href="/mailbox/#forgotPassword">
                                                Forgot Password?
                                            </a>
                                        </div>
                                    </div>
                                    <div className="col-sm-12">
                                        <button
                                            className="btn-blue full-width mt60"
                                            type="buton"
                                            disabled={this.state.signDisabled}
                                            onClick={this.handleClick.bind(
                                                this,
                                                "login"
                                            )}
                                        >
                                            {this.state.buttonText}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
            const content = this.state.maintenanceMode ? maintenanceContent : originalContent;
            return <div>{content}</div>;
        },
    });
});
