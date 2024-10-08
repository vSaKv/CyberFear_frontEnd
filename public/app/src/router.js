define([
    "app",
    "backbone",
    "react",
    "jquery",
    "bootstrap",
    "cmpld/splashPage/SplashCollection",
    //,'cmpld/authorized/authCollection'
], function (
    app,
    Backbone,
    React,
    $,
    Bootstrap,
    SplashCollection
    //	,AuthCollection
) {
    return Backbone.Router.extend({
        routes: {
            "": "index",
            "PE": "payend",
            "report": "report",
            // "login" : "login",
            "login": "loginPage",
            "pricing": "firstTimeLogin",
            "signup": "createUser",
            "signup/:coupon": "createUserCoupon",

            //"signup/:coupon": "createUser",
            // "contactUs" : "contactUs",
            "contact": "reachUs",
            "requestInvitation": "requestInvitation",
            "forgotPassword": "forgotPassword",
            "forgotSecret": "forgotSecret",
            "donateUs": "donate",
            ":whatever": "notfound",

            //https://cyber.com/index.html#retrieveEmailV2/650f4e1680b12c99008b4568

            //password protected routes
            "mail/:directory(/:msg)": "mail",
            "retrieveEmailV2/:emailId": "pinMail",
            "retrieveEmail/:emailId": "pinMail",
            "composeEmail/:emailId": "ComposeUnreg",
            "settings/:options(/:msg)": "settings",
            "updateAccount/:options(/:msg)": "updateAccount",
            "logOut": "logOut",
           // "signup/:coupon": "createUserCoupon",
        },
        execute: function (callback, args) {
            //var tt=setTimeout(function(){
            // $("#spinn").removeClass("d-none");
            // $("#overlay").removeClass("d-none");
            //}, 3000);

            //app.user.set({'loading':tt});

            //console.log(app.user.get('loading'));
            if (callback) callback.apply(this, args);
        },
        /*
		execute: function(callback, args) {
			console.log('call compose');

			if(app.user.get('uploadInProgress')){
				console.log('fffff')
				$('#infoModHead').html("File Upload In Progress");
				$('#infoModBody').html("Please wait untill file uploading complete");
				$('#infoModal').modal('show');
				callback(false);
			}


			callback(args[0]);

		},

		*/
        before: function (callback, args) {
            //var getAuthStatus = APP.controllers.auth_controller.isLogged();
            //	var self = this;
            //}
        },
        initialize: function () {},
        index: function () {
            React.render(
                //<SplashCollection page={"index"} />,
                <SplashCollection page={"login"} />,
                //document.getElementById("mainBody")
                document.getElementById("loginBody")
            );
        },
        terms: function () {
            //console.log(getAuthStatus);
            React.render(
                <SplashCollection page={"terms"} />,
                document.getElementById("mainBody")
            );
        },
        privacy: function () {
            //	console.log(getAuthStatus);
            React.render(
                <SplashCollection page={"privacy"} />,
                document.getElementById("mainBody")
            );
        },
        payend: function () {
            React.render(
                <SplashCollection page={"pe"} />,
                document.getElementById("mainBody")
            );
        },

        canary: function () {
            //	console.log(getAuthStatus);
            React.render(
                <SplashCollection page={"canary"} />,
                document.getElementById("mainBody")
            );
        },
        donate: function () {
            React.render(
                <SplashCollection page={"donate"} />,
                document.getElementById("mainBody")
            );
        },

        login: function () {
            React.render(
                <SplashCollection page={"index"} />,
                document.getElementById("mainBody")
            );
            $("#loginUser").modal("show");
        },
        loginPage: function () {
            React.render(
                <SplashCollection page={"login"} />,
                document.getElementById("loginBody")
            );
        },
        createUser: function () {
            React.render(
                <SplashCollection page={"signup"} coupon=""/>,
                document.getElementById("loginBody")
            );
        },
        // contactUs: function () {
        //     React.render(
        //         <SplashCollection page={"index"} />,
        //         document.getElementById("mainBody")
        //     );
        //     $("#reportBug-modal").modal("show");
        // },
        reachUs: function () {
            React.render(
                <SplashCollection page={"contact"} />,
                document.getElementById("loginBody")
            );
        },
        requestInvitation: function () {
            React.render(
                <SplashCollection page={"index"} />,
                document.getElementById("mainBody")
            );
            $("#reqInvite").modal("show");
        },
        forgotPassword: function () {
            React.render(
                <SplashCollection page={"forgotPassword"} />,
                document.getElementById("loginBody")
            );
        },
        forgotSecret: function () {
            $("head").append(
                $('<link rel="stylesheet" type="text/css" />').attr(
                    "href",
                    "/css/splash.css"
                )
            );
            $("head").append(
                $('<link rel="stylesheet" type="text/css" />').attr(
                    "href",
                    "/css/animate.min.css"
                )
            );

           // $('link[rel=stylesheet][href="/css/main.css"]').remove();

            React.render(
                <SplashCollection page={"forgotSecret"} />,
                document.getElementById("mainBody")
            );
        },
        notfound: function () {
            console.log("not found");
            Backbone.history.navigate("", {
                trigger: true,
            });
        },
        updateAccount: function (options, msg) {
            //Todo disabled for dev
            //if(app.user.get("userLoginToken")==''){
            //	app.restartApp();
            //
            // }

            require(["cmpld/authorized/authCollection"], function (
                AuthCollection
            ) {
                React.render(
                    <AuthCollection
                        page={"updateAccount"}
                        versionUpdate={options}
                    />,
                    document.getElementById("wrapper")
                );
            });
        },
        firstTimeLogin: function () {
            if (app.user.get("userLogedIn")) {
            } else {
                app.restartApp();
            }

            React.render(
                <SplashCollection page={"firstTimeLogin"} />,
                document.getElementById("pricingBody")
            );
        },

        mail: function (options, msg) {
            if (app.user.get("userLogedIn")) {
            } else {
                app.restartApp();
            }

            //if(app.user.get("profileVersion")==''){
            //self.navigate("login", {trigger: true});
            //Backbone.history.navigate("/updateAccount/1", {
            //		trigger : true
            //	});

            //}else{
            require(["cmpld/authorized/authCollection"], function (
                AuthCollection
            ) {
                //clearTimeout(app.mailMan.get('loading'));

                //setTimeout(function(){
                // $("#spinn").addClass("hidden");
                // $("#overlay").addClass("hidden");
                //}, 1000);

                React.render(
                    <AuthCollection page={"mailBox"} folder={options} emailId={msg}/>,
                    document.getElementById("wrapper")
                );
            });
            //}
        },
        createUserCoupon: function (msg) {
            //MemorizeCouponCodeV2
            console.log('111');

         /*   $.ajax({
                method: "POST",
                url: app.defaults.get("apidomain") + "/checkCouponExistV2",
                data: {
                    coupon: msg,
                },
                dataType: "text",
                xhrFields: {
                    withCredentials: true,
                },
            }).done(function (msg) {
                if (msg === "false") {
                    /!*thisComp.setState({
							couponError: "coupon not valid",
							couponSucc:false
						});*!/
                } else if (msg === "true") {
                    /!*thisComp.setState({
							couponError: "",
							couponSucc:true
						});*!/
                }
            });*/
            React.render(
                <SplashCollection page={"signup"} coupon={msg}/>,
                document.getElementById("loginBody")
            );

           // $("#createAccount-modal").modal("show");
            $("#coupon").val(msg);
        },

        pinMail: function (msg) {
            //console.log(msg);
            require(["cmpld/unregistered/unregCollection"], function (
                UnregCollection
            ) {
                React.render(
                    <UnregCollection page={"readEmail"} emailId={msg} />,
                    document.getElementById("wrapper")
                );
            });
        },
        ComposeUnreg: function (msg) {
            //console.log(msg);
            require(["cmpld/unregistered/unregCollection"], function (
                UnregCollection
            ) {
                React.render(
                    <UnregCollection page={"composeEmail"} emailId={msg} />,
                    document.getElementById("mainBody")
                );
            });
        },

        settings: function (options, msg) {
            if (app.user.get("userLogedIn")) {
            } else {
                app.restartApp();
            }
            var Profil = "";
            require([
                "cmpld/authorized/settings/rightpanel/profile",
                "cmpld/authorized/settings/rightpanel/layout",
                "cmpld/authorized/settings/rightpanel/password",
                "cmpld/authorized/settings/rightpanel/coupons",
                "cmpld/authorized/settings/rightpanel/contacts",
                "cmpld/authorized/settings/rightpanel/2step",
                "cmpld/authorized/settings/rightpanel/customDomains",
                "cmpld/authorized/settings/rightpanel/disposableEmails",
                "cmpld/authorized/settings/rightpanel/pgpKeys",
                "cmpld/authorized/settings/rightpanel/webDiv",
                "cmpld/authorized/settings/rightpanel/securityLog",
                "cmpld/authorized/settings/rightpanel/folders",
                "cmpld/authorized/settings/rightpanel/emailFilter",
                "cmpld/authorized/settings/rightpanel/adminPanel",
                "cmpld/authorized/settings/rightpanel/deleteAccount",
                "cmpld/authorized/settings/rightpanel/plan",
                "cmpld/authorized/settings/rightpanel/blackList",
                "cmpld/authorized/settings/rightpanel/sessionTimeout",
                "cmpld/authorized/authCollection",
                "cmpld/authorized/updates/updateVersion1",
                "cmpld/authorized/settings/rightpanel/aliasEmails"
            ], function (
                Profile,
                Layout,
                Password,
                Coupons,
                Contacts,
                Step2,
                Domains,
                Disposable,
                Pgp,
                Webdiv,
                Security,
                Folders,
                Spam,
                adminPanel,
                Delete,
                Plan,
                blackList,
                sessionTimeout,
                AuthCollection,
                UpdateVersion1,
                Aliases
            ) {
                //clearTimeout(app.mailMan.get('loading'));

                //var tt=setTimeout(function(){
                $("#settings-spinner").removeClass("d-none").addClass("d-block");
                //}, 1000);

                switch (options) {
                    case "Profile":
                        Profil = Profile;
                        break;
                    case "Layout":
                        Profil = Layout;
                        break;

                    case "Password":
                        Profil = Password;
                        break;

                    case "Contacts":
                        Profil = Contacts;
                        break;

                    case "Custom-Domain":
                        Profil = Domains;
                        break;

                    case "Disposable-Aliases":
                        Profil = Disposable;
                        break;

                    case "PGP-Keys":
                        Profil = Pgp;
                        break;

                    case "WebDiv":
                        Profil = Webdiv;
                        break;

                    case "2-Step":
                        Profil = Step2;
                        break;

                    case "Security-Log":
                        Profil = Security;
                        break;

                    case "Folders":
                        Profil = Folders;
                        break;

                    case "Filter":
                        Profil = Spam;
                        break;
                    case "Black-List":
                        Profil = blackList;
                        break;

                    case "AdminPanel":
                        Profil = adminPanel;
                        break;

                    case "Delete-Account":
                        Profil = Delete;
                        break;
                    case "Session-Timeout":
                        Profil = sessionTimeout;
                        break;
                    case "Coupons":
                        Profil = Coupons;
                        break;

                    case "Plan":
                        Profil = Plan;
                        break;
                    case "updateVersion1":
                        Profil = UpdateVersion1;
                        break;
                    case "Aliases":
                        Profil = Aliases;
                        break;
                }
                React.render(
                    <AuthCollection
                        page={"settings"}
                        rightPanel={Profil}
                        activePage={options}
                    />,
                    document.getElementById("wrapper")
                );
            });
            //}
        },
        logOut: function () {
            //React.render(
            //location.reload(true);
            //window.location.href = '';
            //<SplashCollection page={'index'}/>,
            //document.getElementById('mainBody')
            //);
        },
    });
});
