import { Component } from '@angular/core';
import { NavParams, ViewController, ToastController, ModalController } from 'ionic-angular';
import { UserServices } from '../../lib/service/user';
import { SignupAssistant } from '../../lib/service/signupassistant';
import { EventSignupModal } from './eventsignup_modal';
import { EventDetail } from '../../lib/model/event-detail';
import { VolunteerEventsService } from '../../lib/service/volunteer-events-service';
import { AlertController, NavController, App } from 'ionic-angular';
import { NOTIFICATION_SCHEDULE, NOTIFICATION_OPTIONS, AGE_RESTRICTION, GENDER_RESTRICTION, VOLUNTEER_RESTRICTION, EVENT_STATUS, SAMEDAY_RESTRICTION, ORG_RESTRICTION } from './../../lib/provider/eventConstants';
import { LoginPage } from '../login/login';
import { RegisterLoginPage } from '../register-login/register-login';
import { RegisterIndividualProfilePage } from '../register-individual-profile/register-individual-profile';
import { OrganizationServices } from '../../lib/service/organization';

@Component({
    templateUrl: 'eventdetail_modal.html',
    providers: [OrganizationServices]
})

export class EventDetailModal {
    eventId: String;
    eventDetail: EventDetail;
    signedUp: Boolean = false;
    showStatus: Boolean = false;
    showDetails: Boolean = false;
    guestUser: Boolean = false;
    registering: Boolean = false;
    gender = GENDER_RESTRICTION;
    vRestriction = VOLUNTEER_RESTRICTION;
    eStatus = EVENT_STATUS;
    sdRestriction = SAMEDAY_RESTRICTION;
    aRestriction = AGE_RESTRICTION;
    nSchedule = NOTIFICATION_SCHEDULE;
    nOptions = NOTIFICATION_OPTIONS;
    oRestriction = ORG_RESTRICTION;
    deregisterResult: any;

    public myPreferencesObservable;
    public myPreferences;

    constructor(params: NavParams,
        private volunteerEventsService: VolunteerEventsService,
        private userServices: UserServices,
        public viewCtrl: ViewController,
        public alertCtrl: AlertController,
        public modalCtrl: ModalController,
        public toastController: ToastController,
        public appCtrl: App,
        public navController: NavController,
        private signupAssistant: SignupAssistant) {
        this.viewCtrl = viewCtrl;
        this.eventId = params.get('id');

        this.signedUp = params.get('registered');
        this.guestUser = params.get('guestUser');
        this.myPreferences = params.get('preference_data');

    }

    ngOnInit() {
        this.registering = false;
        this.loadDetails();
        this.signupAssistant.setGuestSignup(false);
    }

    presentToast(message: string) {
        let toast = this.toastController.create({
            message: message,
            duration: 2000,
            position: 'middle'
        });
        toast.present();
    }

    loadDetails() {

        if (this.userServices.isAdmin()) {
            //check account for admin status
            this.getAdminEventDetails(this.eventId);
            //if they have admin status load admin view of events
        }
        else {
            this.getEventDetails(this.eventId);
        }
    }

    youAreNotEligible() {
        let confirm = this.alertCtrl.create({
            title: '',
            cssClass: 'alertReminder',
            message: 'You are not eligible for this event sign up',
            buttons: [
                {
                    text: 'Ok',
                    handler: () => {
                    }
                }
            ]
        });
        confirm.present();
    }

    getAdminEventDetails(id) {
        this.volunteerEventsService
            .getAdminEventDetails(id).subscribe(
            (event) => {
                this.eventDetail = event;
                if (id == 3689) {
                    this.eventDetail.org_restriction = "1";
                    console.log("The org restriction is " + this.eventDetail.org_restriction);
                    console.log("the eventDetail has its org restriction as " + this.eventDetail.org_restriction);

                }
                console.log(this.eventDetail);
            },
            (err) => {
                console.log(err);
            },
            () => {
                console.log("completed");
            }
            );
        console.log("getAdminEventDetails");
    }

    getEventDetails(id) {
        this.volunteerEventsService
            .getVolunteerEventDetails(id).subscribe(
            (event) => {
                this.eventDetail = event;
                if (id == 3689) {
                    this.eventDetail.org_restriction = "1";
                    console.log("the eventDetail has its org restriction as " + this.eventDetail.org_restriction);
                    //for any event that is org only restricted, only group admins and TSA admins can signup 
                    this.youAreNotEligible();
                }

            },
            (err) => {
                console.log(err);
            },
            () => {
                console.log("completed");
            }
            );
        console.log("getEventDetails");
    }

    unregisteredUserPopover() {
        let confirm = this.alertCtrl.create({
            title: '',
            cssClass: 'alertReminder',
            message: 'Only registered users can sign up for events.',
            buttons: [
                {
                    text: 'Register',
                    handler: () => {
                        this.signupAssistant.setCurrentEventId(this.eventId);
                        this.signupAssistant.setGuestSignup(true);
                        this.appCtrl.getRootNav().push(RegisterLoginPage);
                        this.viewCtrl.dismiss();

                    }
                },
                {
                    text: 'Login',
                    handler: () => {
                        this.signupAssistant.setCurrentEventId(this.eventId);
                        this.signupAssistant.setGuestSignup(true);
                        this.appCtrl.getRootNav().push(LoginPage);
                        this.viewCtrl.dismiss();

                    }
                }
            ]
        });
        confirm.present();
    }


    signupEventRegistration(eventData) {

        let admin = false;
        let eventType = eventData.org_restriction;
        let eventId = eventData.id;

        for (let i in this.myPreferences.organizations) {
            if (this.myPreferences.organizations[i].role == 1 || this.myPreferences.organizations[i].role == 2) {
                admin = true;
            } else {
                admin = false
            }
        }
        if (eventType == 1) {

            //TODO: Event only Logic
            //IF USER is not The leader of any group

            if (!admin) {
                let confirm = this.alertCtrl.create({
                    title: '',
                    cssClass: 'alertReminder',
                    message: 'Group event sign-up is only available to Group Admins.',
                    buttons: [
                        {
                            text: 'Ok',
                            handler: () => {

                            }
                        }
                    ]
                });
                confirm.present();

            } else {
                this.eventSignupModal(eventData, admin);
            }

        } else if (eventType == 0) {
            this.eventSignupModal(eventData, admin);
        } else {
            //Continue with existing logic
            this.signupAssistant.setCurrentEventId(eventId);
            this.volunteerEventsService
                .checkMyEvents(eventId).subscribe(
                res => {
                    this.signupAssistant.signupEventRegistration();
                },
                err => {
                    console.log(err);
                    // this.signupassitant.signupEventRegistration();
                    if (err._body.indexOf("Event registration is full") > 0) {
                        let confirm = this.alertCtrl.create({
                            title: '',
                            cssClass: 'alertReminder',
                            message: 'Event Registration is full. We encourage you to search for similar events scheduled.',
                            buttons: [
                                {
                                    text: 'Ok',
                                    handler: () => {
                                        console.log('Ok, clicked');
                                    }
                                }
                            ]
                        });
                        confirm.present();
                    } else {
                        let confirm = this.alertCtrl.create({
                            title: '',
                            cssClass: 'alertReminder',
                            message: 'YOU have not filled in all of the required information to sign up for an event. <br><br> Would you like to navigate to the My Profile page?',
                            buttons: [
                                {
                                    text: 'No',
                                    handler: () => {
                                        console.log('No clicked');
                                    }
                                },
                                {
                                    text: 'Yes',
                                    handler: () => {
                                        console.log('Yes clicked');
                                        this.navController.push(RegisterIndividualProfilePage, { errorResponse: err });
                                    }
                                }
                            ]
                        });
                        confirm.present();
                    }
                });

        }
    }

    eventSignupModal(event_data, is_admin) {

        let eventsignupPopup = this.modalCtrl.create(EventSignupModal, {
            "event_data": event_data,
            "is_admin": is_admin,
        });

        eventsignupPopup.present(/*{ev}*/);
        eventsignupPopup.onDidDismiss(data => {
            this.volunteerEventsService.loadMyEvents();
            if (data == true) {
                this.dismiss();
            }
        });
    }


    signup(id, noti_sched, overlap: boolean) {
        this.volunteerEventsService
            .eventRegisterAndSetReminder(id, noti_sched, 1, overlap).subscribe(
            event => {

                this.presentToast("Event sign-up successful.");
                this.signedUp = true;
            },
            err => {
                if (err._body.indexOf("overlaps") > 0) {
                    let confirm = this.alertCtrl.create({
                        title: '',
                        cssClass: 'alertReminder',
                        message: 'This event overlaps with another event that you already have scheduled. <br>  <br> Would you like to overlap the event?',
                        buttons: [
                            {
                                text: 'No',
                                handler: () => {
                                }
                            },
                            {
                                text: 'Yes',
                                handler: () => {
                                    this.signup(id, noti_sched, true);
                                }
                            }
                        ]
                    });
                    confirm.present();
                }
                else if (err._body.indexOf("Event registration is full") > 0) {
                    let confirm = this.alertCtrl.create({
                        title: '',
                        cssClass: 'alertReminder',
                        message: 'Event registration is full.',
                        buttons: [
                            {
                                text: 'Ok',
                                handler: () => {

                                }
                            }
                        ]
                    });
                    confirm.present();
                }
                else {
                    console.log(err);
                    this.presentToast("Error signing up for event");
                }
            }, () => {
                this.volunteerEventsService.loadMyEvents();
            });
    }
    deRegister(id) {
        this.volunteerEventsService
            .eventDeregister(id).subscribe(
            result => {
                this.deregisterResult = result;
                this.presentToast("You are no longer signed up for this event");
                this.signedUp = false;
            },
            err => {
                console.log(err);
                this.presentToast("Error cancelling event registration");
            }, () => {
                this.volunteerEventsService.loadMyEvents();
                this.loadDetails();
            });
    }
    dismiss() {
        this.viewCtrl.dismiss();
    }

    onDidDismiss() {
        this.viewCtrl.onDidDismiss(function (data) {
        });
    }
    cancelEventRegisteration(id) {
        let confirm = this.alertCtrl.create({
            title: '',
            cssClass: 'alertReminder',
            message: 'Are you sure you want to cancel this event Registration?',
            buttons: [
                {
                    text: 'No',
                    handler: () => {

                    }
                },
                {
                    text: 'Yes',
                    handler: () => {

                        this.deRegister(id);
                    }
                }
            ],
            enableBackdropDismiss: false
        });
        confirm.present();
    }
}
