define(["react", "app", "cmpld/authorized/mailbox/notifications"], function (
    React,
    app,
    Notifications
) {
    "use strict";
    return React.createClass({
        getInitialState: function () {
            return {
                notificationFlag: false,
            };
        },
        handleClick: function (action, event) {
            switch (action) {
                case "back-to-inbox":
                    app.user.set({ isComposingEmail: false });
                    app.user.set({ isDraftOpened: false });
                    app.user.set({ isDecryptingEmail: false });
                    Backbone.history.navigate("/mail/Inbox", {
                        trigger: true,
                    });
                    break;
                case "open-notifications":
                    this.setState({
                        notificationFlag: !this.state.notificationFlag,
                    });
                    break;
            }
        },
        render: function () {
            return (
                <div className="setting-right-top">
                    <div className="top-data">
                        <div className="dropdown icon-notification d-none">
                            <button
                                className="btn btn-secondary"
                                type="button"
                                id="app-notifications"
                                onClick={this.handleClick.bind(
                                    this,
                                    "open-notifications"
                                )}
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                        d="M12.0001 2.25C8.19416 2.25 4.98379 5.08406 4.51172 8.86064L3.5228 16.772C3.32514 18.3533 4.55813 19.75 6.15174 19.75H7.5127L7.56505 19.8678C8.34402 21.6205 10.0821 22.75 12.0001 22.75C13.9181 22.75 15.6562 21.6205 16.4352 19.8678L16.4875 19.75H17.8485C19.4421 19.75 20.6751 18.3533 20.4775 16.772L19.4886 8.86064C19.0165 5.08406 15.8061 2.25 12.0001 2.25ZM16.0172 18.25C16.0061 18.2498 15.9949 18.2498 15.9838 18.25H8.0164C8.00528 18.2498 7.99415 18.2498 7.98299 18.25H6.15174C5.46038 18.25 4.92547 17.6441 5.01122 16.958L6.00014 9.04669C6.37838 6.02075 8.95065 3.75 12.0001 3.75C15.0496 3.75 17.6219 6.02075 18.0001 9.04669L18.9891 16.958C19.0748 17.6441 18.5399 18.25 17.8485 18.25H16.0172ZM9.20531 19.75H14.7949C14.1807 20.6765 13.1361 21.25 12.0001 21.25C10.8641 21.25 9.8195 20.6765 9.20531 19.75Z"
                                    />
                                </svg>
                                <span>12</span>
                            </button>
                        </div>
                        <div className="back-to-inbox-link">
                            <a
                                onClick={this.handleClick.bind(
                                    null,
                                    "back-to-inbox"
                                )}
                            >
                                Back to inbox
                            </a>
                        </div>
                    </div>
                    {this.state.notificationFlag && <Notifications />}
                </div>
            );
        },
    });
});
