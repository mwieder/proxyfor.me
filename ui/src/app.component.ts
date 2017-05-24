import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Router } from '@angular/router';

import { amProposalHead, amProposal, amProfile } from './classes';
import { amGlobalService } from './global.service';
import { amProfileService } from './profile.service';
import { amProposalService } from './proposal.service';
import { amLoginService } from './login.service';

@Component({
  moduleId: module.id,
  selector: 'my-app',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.css']
})
export class amAppComponent implements OnInit {
  currentHead: amProposalHead;
  lastHead: amProposalHead;
  nextHead: amProposalHead;

  constructor(private router: Router,
    private globalService: amGlobalService,
    private loginService: amLoginService,
    private profileService: amProfileService,
    private proposalService: amProposalService) { }

  ngOnInit(): void {
    this.globalService.init();
    this.profileService.getProfile(this.globalService.myProfile.screen_name)
      .then(result => {
        if (result) {
          this.globalService.myProfile = result;
          this.profileService.getCites()
            .then(c => {
              c.forEach(e => { this.globalService.myCites[e.post] = true; });
            })
            .catch(e => this.profileService.handleError(e));
        }
      })
      .catch(e => this.profileService.handleError(e));
    this.proposalService.getHeads().then(heads => {
      for (let i = 0; i < heads.length; i++)
        if (heads[i].order === Number.MAX_SAFE_INTEGER / 2) { // first entry is "current" marker
          this.currentHead = heads[i];
          this.lastHead = heads[i - 1];
          this.nextHead = heads[i + 1];
          break;
        }
      this.globalService.proposalHeads = heads;
      this.router.navigate(["/proposal/" + this.currentHead.id + 'v' + this.currentHead.version]);
    });
  }

  logout() {
    this.globalService.logout();
    location.reload(true); // force restart, should just reload app, but router doesn't support this
  }
}
