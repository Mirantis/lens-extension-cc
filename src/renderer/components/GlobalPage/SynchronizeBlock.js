import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import {
  TriStateCheckbox,
  checkValues,
} from '../TriStateCheckbox/TriStateCheckbox';
import { Accordion } from '../Accordion/Accordion';
import { layout } from '../styles';
import { synchronizeBlock } from '../../../strings';

const { Component } = Renderer;

const Content = styled.div(() => ({
  marginTop: layout.gap * 2,
  maxWidth: '750px',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
}));

const Title = styled.h3(() => ({
  marginBottom: layout.pad,
  alignSelf: 'start',
}));

const Projects = styled.div(() => ({
  background: 'var(--secondaryBackground)',
  border: '1px solid',
  borderColor: 'var(--inputControlBorder)',
  borderRadius: 5,
}));

const ProjectsHead = styled.div(() => ({
  display: 'flex',
  alignItems: 'center',
  paddingTop: layout.grid * 4,
  paddingLeft: layout.grid * 9.5,
  paddingRight: layout.grid * 9.5,
  paddingBottom: layout.grid * 2,
  borderBottom: '1px solid',
  borderColor: 'var(--hrColor)',
}));

const ProjectsBody = styled.div(() => ({
  paddingTop: layout.grid * 1.5,
  paddingLeft: layout.grid * 3.25,
  paddingRight: layout.grid * 3.25,
  paddingBottom: layout.grid * 4.5,
}));

const ProjectsList = styled.ul(() => ({
  '& > li:not(:last-of-type)': {
    marginBottom: layout.grid * 2.5,
  },
}));

const AccordionChildrenList = styled.ul(() => ({
  paddingLeft: layout.grid * 13.5,
  paddingRight: layout.grid * 13.5,

  '& > li': {
    paddingTop: layout.grid * 1.5,
    paddingLeft: layout.grid * 5,
    paddingRight: layout.grid * 5,
    paddingBottom: layout.grid * 1.5,
  },

  '& > li:nth-of-type(odd)': {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
}));

const SynchronizeProjectsButtonWrapper = styled.div(() => ({
  marginTop: layout.grid * 4,
}));

const SortButton = styled.button`
  display: flex;
  background: transparent;
  margin-left: ${layout.grid * 2}px;
  cursor: pointer;
  transform: ${({ isRotated }) =>
    isRotated ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const mockedExtCloud = {
  cloud: {
    id_token:
      'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJuZFZKaGVFNVF0M0VSVEZUY3VDMUJzRzB2VDZXTDhsUmxMa1NWYkVIMEE4In0.eyJleHAiOjE2NDI0MzUwNTgsImlhdCI6MTY0MjQzNDc1OCwiYXV0aF90aW1lIjoxNjQyNDI5MzMwLCJqdGkiOiJiMDU1NWMzMC02OWNlLTQ4ZGUtODBiNy0xNDExZWY3MTFlZjIiLCJpc3MiOiJodHRwczovL2NvbnRhaW5lci1jbG91ZC1hdXRoLmludC5taXJhbnRpcy5jb20vYXV0aC9yZWFsbXMvaWFtIiwiYXVkIjoia2FhcyIsInN1YiI6IjFmYTllNzM4LTdiNWQtNGQxMC04ZmVjLTUwNzQ5NjY3Y2IwNSIsInR5cCI6IklEIiwiYXpwIjoia2FhcyIsInNlc3Npb25fc3RhdGUiOiJjNTUzMzI1NS0zOGU5LTRhOTktOTUzMS1mMmVlNWNmMmJiYWYiLCJhdF9oYXNoIjoiM0c1WmM5MjFsU3RJcXg2T2JqNHFYdyIsImFjciI6IjAiLCJpYW1fcm9sZXMiOlsibTprYWFzOmxleC1ucy0xQHdyaXRlciIsIm06a2FhczpsZXgtbnMtMkB3cml0ZXIiLCJtOmthYXM6aW1jLW1jYy11eC10ZWFtQHdyaXRlciJdLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsIm5hbWUiOiJCb2dkYW4gTmFsaXNuaWtvdnNraXkiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJibmFsaXNuaWtvdnNraXlAbWlyYW50aXMuY29tIiwiZ2l2ZW5fbmFtZSI6IkJvZ2RhbiIsImZhbWlseV9uYW1lIjoiTmFsaXNuaWtvdnNraXkiLCJlbWFpbCI6ImJuYWxpc25pa292c2tpeUBtaXJhbnRpcy5jb20ifQ.Huy6XOFG6JlM4ZIV-KSdTIP3sSTyNS9-Brc_7ZjiQRyCFk4fJRFJQwt9Ovhe5NS6I4HQRhmR7TSHmFDLv9OTJQ-e8IteiUeb-ixseKtAFecBFYFX6HwktbZW9j-VJK7hXvL8Cgf03tCVJmSr74y7SnAwhAwJkp5PX6ZoTFQAECEv6tz4-DSQiCcPv-z9wOf6AYjgkc0i28gDcwBNJvDdhdgWClJ1tZS1pkYFGP2uiX8M_9hOSxxshIWuCyFvqe_RLC-yL9vKD5yy-XUb7PW3kw_ZfmYTeL4nGRsZU7zWLcnF7E1mFrOFRvLDjRSIY-vagJeVg1qEmT-FWOK28yUBkQ',
    expires_in: 300,
    refresh_token:
      'eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIxYmJkMWQ1MS1hYzMwLTQ2YWUtOGI5MC02Y2Q5MzFkMjg5YWYifQ.eyJleHAiOjE2NDI0MzY1NTgsImlhdCI6MTY0MjQzNDc1OCwianRpIjoiZTM1YmFmMTUtM2E4NC00NWE2LTk3MWItYTE4NDNiNTI1YTY3IiwiaXNzIjoiaHR0cHM6Ly9jb250YWluZXItY2xvdWQtYXV0aC5pbnQubWlyYW50aXMuY29tL2F1dGgvcmVhbG1zL2lhbSIsImF1ZCI6Imh0dHBzOi8vY29udGFpbmVyLWNsb3VkLWF1dGguaW50Lm1pcmFudGlzLmNvbS9hdXRoL3JlYWxtcy9pYW0iLCJzdWIiOiIxZmE5ZTczOC03YjVkLTRkMTAtOGZlYy01MDc0OTY2N2NiMDUiLCJ0eXAiOiJSZWZyZXNoIiwiYXpwIjoia2FhcyIsInNlc3Npb25fc3RhdGUiOiJjNTUzMzI1NS0zOGU5LTRhOTktOTUzMS1mMmVlNWNmMmJiYWYiLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIn0.LU6JiMt6aTwExRhQXrN0v1E4_i5mZL40PUu9XaTps68',
    refresh_expires_in: 1800,
    expiresAt: 1642435058,
    refreshExpiresAt: 1642436558,
    idpClientId: null,
    username: 'bnalisnikovskiy@mirantis.com',
    cloudUrl: 'https://container-cloud.int.mirantis.com',
    name: '',
    syncAll: false,
    syncNamespaces: [],
  },
  loading: false,
  namespaces: [
    {
      name: 'imc-mcc-ux-team',
      clusters: [],
      clustersCount: 0,
      sshKeys: [],
      sshKeysCount: 0,
      credentials: {
        awscredential: [],
        allCredentialsCount: 1,
        byocredential: [],
        openstackcredential: [{}],
      },
    },
    {
      name: 'lex-ns-1',
      clusters: [
        {
          id: 'b19d0e34-dd38-4f92-94f5-20032dd9e1cf',
          name: 'scameron-ost-demo-ns-1',
          namespace: 'lex-ns-1',
          created: '2021-12-03T22:46:46.000Z',
          deleteInProgress: false,
          isManagementCluster: false,
          ready: true,
          serverUrl: 'https://172.19.121.7:443',
          idpIssuerUrl:
            'https://container-cloud-auth.int.mirantis.com/auth/realms/iam',
          idpCertificate:
            'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUUwRENDQTdpZ0F3SUJBZ0lCQnpBTkJna3Foa2lHOXcwQkFRc0ZBRENCZ3pFTE1Ba0dBMVVFQmhNQ1ZWTXgKRURBT0JnTlZCQWdUQjBGeWFYcHZibUV4RXpBUkJnTlZCQWNUQ2xOamIzUjBjMlJoYkdVeEdqQVlCZ05WQkFvVApFVWR2UkdGa1pIa3VZMjl0TENCSmJtTXVNVEV3THdZRFZRUURFeWhIYnlCRVlXUmtlU0JTYjI5MElFTmxjblJwClptbGpZWFJsSUVGMWRHaHZjbWwwZVNBdElFY3lNQjRYRFRFeE1EVXdNekEzTURBd01Gb1hEVE14TURVd016QTMKTURBd01Gb3dnYlF4Q3pBSkJnTlZCQVlUQWxWVE1SQXdEZ1lEVlFRSUV3ZEJjbWw2YjI1aE1STXdFUVlEVlFRSApFd3BUWTI5MGRITmtZV3hsTVJvd0dBWURWUVFLRXhGSGIwUmhaR1I1TG1OdmJTd2dTVzVqTGpFdE1Dc0dBMVVFCkN4TWthSFIwY0RvdkwyTmxjblJ6TG1kdlpHRmtaSGt1WTI5dEwzSmxjRzl6YVhSdmNua3ZNVE13TVFZRFZRUUQKRXlwSGJ5QkVZV1JrZVNCVFpXTjFjbVVnUTJWeWRHbG1hV05oZEdVZ1FYVjBhRzl5YVhSNUlDMGdSekl3Z2dFaQpNQTBHQ1NxR1NJYjNEUUVCQVFVQUE0SUJEd0F3Z2dFS0FvSUJBUUM1NE1zUTFLOTJ2ZFNUWXVzd1pMaUJDR3pECkJObGlGNDR2L3o1bHo0L09ZdVk4VWh6YUZrVkxWYXQ0YTJPRFlwRE9EMmxzbWNnYUZJdE16RVV6Nm9qY25xT3YKSy82QVlaMTVWOFRQTHZRL01EeGRSL3lhRnJ6RE41WkJVWTRSUzFUNEtMN1FqTDd3TURnZTg3QW0rR1pIWTIzZQpjU1pIanpoSFU5RkdIYlRqM0FEcVJheTl2SEhacW04QTI5dk5NRHA1VDE5TVIvZ2Q3MXZDeEoxZ083R3lRNUhZCnBETk82clBXSjArdEpZcWx4dlRWMEthdWRBVmtWNGkxUkZYVUxTbzZQdmk0dmVreUNnS1VaTVFXT2xEeFNxN24KZVRPdkRDQUhmK2pmQkRuQ2FRSnNZMUw2ZDhFYnlIU0h5TG1UR0ZCVU5VdHBUcnc3MDBrdUg5ekIwbEw3QWdNQgpBQUdqZ2dFYU1JSUJGakFQQmdOVkhSTUJBZjhFQlRBREFRSC9NQTRHQTFVZER3RUIvd1FFQXdJQkJqQWRCZ05WCkhRNEVGZ1FVUU1LOUo0N01OSU13b2pQWCsyeXo4TFFzZ000d0h3WURWUjBqQkJnd0ZvQVVPcHFGQnhCbktMYnYKOXIwRlFXNGd3WlRhRDk0d05BWUlLd1lCQlFVSEFRRUVLREFtTUNRR0NDc0dBUVVGQnpBQmhoaG9kSFJ3T2k4dgpiMk56Y0M1bmIyUmhaR1I1TG1OdmJTOHdOUVlEVlIwZkJDNHdMREFxb0NpZ0pvWWthSFIwY0RvdkwyTnliQzVuCmIyUmhaR1I1TG1OdmJTOW5aSEp2YjNRdFp6SXVZM0pzTUVZR0ExVWRJQVEvTUQwd093WUVWUjBnQURBek1ERUcKQ0NzR0FRVUZCd0lCRmlWb2RIUndjem92TDJObGNuUnpMbWR2WkdGa1pIa3VZMjl0TDNKbGNHOXphWFJ2Y25rdgpNQTBHQ1NxR1NJYjNEUUVCQ3dVQUE0SUJBUUFJZm15VEVNZzR1SmFwa0V2L29WOVBCTzlzUHB5SUJzbFFqNlp6CjkxY3hHNzY4NUMvYitMclRXK0MwNStaNVlnNE1vdGRxWTNNeHRmV29TS1E3Q0MyaVhaRFh0SHdsVHhGV01NUzIKUkoxN0xKM2xYdWJ2REdHcXYrUXFHKzZFbnJpRGZjRkR6a1NuRTNBTmtSLzB5Qk90ZzJEWjJIS29jeVFldGF3aQpEc29YaVdKWVJCdXJpU1VCQUEvTnhCdGkyMUcwMHc5UktwdjB2SFA4ZHM0MnBNM1oyQ3pxcnB2MUtyS1EwVTExCkdJby9pa0dRSTMxYlMvNmtBMWliUnJMRFlHQ0QrSDFRUWM3Q29aRER1KzhDTDlJVlZPNUVGZGtLcnFlS00rMngKTFhZMkp0d0U2NS8zWVI4VjNJZHY3a2FXS0syaEpuMEtDYWN1QktPTnZQaThCREFCCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
          idpClientId: 'k8s',
          apiCertificate:
            'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJmakNDQVNTZ0F3SUJBZ0lVSXE4VkNMdEQ1dE9MbC91VkVKNVI0K0RWK0Ywd0NnWUlLb1pJemowRUF3SXcKSFRFYk1Ca0dBMVVFQXhNU1ZVTlFJRU5zYVdWdWRDQlNiMjkwSUVOQk1CNFhEVEl4TVRJd016SXlOVE13TUZvWApEVEkyTVRJd01qSXlOVE13TUZvd0hURWJNQmtHQTFVRUF4TVNWVU5RSUVOc2FXVnVkQ0JTYjI5MElFTkJNRmt3CkV3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFbC9FRnM4WkFhOXk0OTJEMTVBcVJEbXIwcStiWWpuTG0KTUswVkpGS2VKcVhGQXFnUDRKazJrM2xqcnJHMkJSWW9RZUE2b2prci9ZYlBQc2N0WFNMa2VhTkNNRUF3RGdZRApWUjBQQVFIL0JBUURBZ0VHTUE4R0ExVWRFd0VCL3dRRk1BTUJBZjh3SFFZRFZSME9CQllFRk1DOVhGR2hCdW9tCm1JV0VNK1dZZkg1d3JpaC9NQW9HQ0NxR1NNNDlCQU1DQTBnQU1FVUNJUUMyWWpnZWZ2bG5LeDNWK3BCQVB2cHUKZDFXWFVpY0tJbjNHbU4xVFJhTFdGQUlnR1FDTk42ZTRGMW0xd3BlOU4vakZVMk01TUVDN2tmeXRJajRiNGwvQwoyMW89Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJhakNDQVJDZ0F3SUJBZ0lVUElzKzUvbHlOcDlRdGJZSUNLTlZ4YU9VL2VNd0NnWUlLb1pJemowRUF3SXcKRXpFUk1BOEdBMVVFQXhNSWMzZGhjbTB0WTJFd0hoY05NakV4TWpBek1qSTFNekF3V2hjTk5ERXhNVEk0TWpJMQpNekF3V2pBVE1SRXdEd1lEVlFRREV3aHpkMkZ5YlMxallUQlpNQk1HQnlxR1NNNDlBZ0VHQ0NxR1NNNDlBd0VICkEwSUFCTTg5cmdkajJva3pGQ2xsVC9WczRSc3M3aEFZdmRqK0FCaDBzNGZ0bWE2V3gwMHBpYVkvbmFpMmswaWgKMlQzbjZjbXpGTTE5TjZDVll3ZThXZXlqbyt1alFqQkFNQTRHQTFVZER3RUIvd1FFQXdJQkJqQVBCZ05WSFJNQgpBZjhFQlRBREFRSC9NQjBHQTFVZERnUVdCQlF1bW5vTFA0SmVWWFJYTmc3Ny9NemRMaXY3OVRBS0JnZ3Foa2pPClBRUURBZ05JQURCRkFpRUE5NzNpdXlDaHN0aGVMMUZPTkgvamhiTkRHS1QxeUhMcG1XMXNvd2tDSERjQ0lEMUQKd0N0RlhrRUVFczdWd0ZCU0VIL1J4Sjk0WEY5cm9QVis5U2ZUdjgyRAotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',
          ucpUrl: 'https://172.19.121.7:6443',
          provider: 'openstack',
          region: 'openstack-eu',
        },
      ],
      clustersCount: 1,
      sshKeys: [],
      sshKeysCount: 0,
      credentials: {
        awscredential: [],
        allCredentialsCount: 1,
        byocredential: [],
        openstackcredential: [{}],
      },
    },
    {
      name: 'lex-ns-2',
      clusters: [
        {
          id: '8bdded96-6fa0-48ff-acad-637ecb802ba2',
          name: 'scameron-ost-demo-ns-2',
          namespace: 'lex-ns-2',
          created: '2021-12-03T22:47:03.000Z',
          deleteInProgress: false,
          isManagementCluster: false,
          ready: true,
          serverUrl: 'https://172.19.120.100:443',
          idpIssuerUrl:
            'https://container-cloud-auth.int.mirantis.com/auth/realms/iam',
          idpCertificate:
            'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUUwRENDQTdpZ0F3SUJBZ0lCQnpBTkJna3Foa2lHOXcwQkFRc0ZBRENCZ3pFTE1Ba0dBMVVFQmhNQ1ZWTXgKRURBT0JnTlZCQWdUQjBGeWFYcHZibUV4RXpBUkJnTlZCQWNUQ2xOamIzUjBjMlJoYkdVeEdqQVlCZ05WQkFvVApFVWR2UkdGa1pIa3VZMjl0TENCSmJtTXVNVEV3THdZRFZRUURFeWhIYnlCRVlXUmtlU0JTYjI5MElFTmxjblJwClptbGpZWFJsSUVGMWRHaHZjbWwwZVNBdElFY3lNQjRYRFRFeE1EVXdNekEzTURBd01Gb1hEVE14TURVd016QTMKTURBd01Gb3dnYlF4Q3pBSkJnTlZCQVlUQWxWVE1SQXdEZ1lEVlFRSUV3ZEJjbWw2YjI1aE1STXdFUVlEVlFRSApFd3BUWTI5MGRITmtZV3hsTVJvd0dBWURWUVFLRXhGSGIwUmhaR1I1TG1OdmJTd2dTVzVqTGpFdE1Dc0dBMVVFCkN4TWthSFIwY0RvdkwyTmxjblJ6TG1kdlpHRmtaSGt1WTI5dEwzSmxjRzl6YVhSdmNua3ZNVE13TVFZRFZRUUQKRXlwSGJ5QkVZV1JrZVNCVFpXTjFjbVVnUTJWeWRHbG1hV05oZEdVZ1FYVjBhRzl5YVhSNUlDMGdSekl3Z2dFaQpNQTBHQ1NxR1NJYjNEUUVCQVFVQUE0SUJEd0F3Z2dFS0FvSUJBUUM1NE1zUTFLOTJ2ZFNUWXVzd1pMaUJDR3pECkJObGlGNDR2L3o1bHo0L09ZdVk4VWh6YUZrVkxWYXQ0YTJPRFlwRE9EMmxzbWNnYUZJdE16RVV6Nm9qY25xT3YKSy82QVlaMTVWOFRQTHZRL01EeGRSL3lhRnJ6RE41WkJVWTRSUzFUNEtMN1FqTDd3TURnZTg3QW0rR1pIWTIzZQpjU1pIanpoSFU5RkdIYlRqM0FEcVJheTl2SEhacW04QTI5dk5NRHA1VDE5TVIvZ2Q3MXZDeEoxZ083R3lRNUhZCnBETk82clBXSjArdEpZcWx4dlRWMEthdWRBVmtWNGkxUkZYVUxTbzZQdmk0dmVreUNnS1VaTVFXT2xEeFNxN24KZVRPdkRDQUhmK2pmQkRuQ2FRSnNZMUw2ZDhFYnlIU0h5TG1UR0ZCVU5VdHBUcnc3MDBrdUg5ekIwbEw3QWdNQgpBQUdqZ2dFYU1JSUJGakFQQmdOVkhSTUJBZjhFQlRBREFRSC9NQTRHQTFVZER3RUIvd1FFQXdJQkJqQWRCZ05WCkhRNEVGZ1FVUU1LOUo0N01OSU13b2pQWCsyeXo4TFFzZ000d0h3WURWUjBqQkJnd0ZvQVVPcHFGQnhCbktMYnYKOXIwRlFXNGd3WlRhRDk0d05BWUlLd1lCQlFVSEFRRUVLREFtTUNRR0NDc0dBUVVGQnpBQmhoaG9kSFJ3T2k4dgpiMk56Y0M1bmIyUmhaR1I1TG1OdmJTOHdOUVlEVlIwZkJDNHdMREFxb0NpZ0pvWWthSFIwY0RvdkwyTnliQzVuCmIyUmhaR1I1TG1OdmJTOW5aSEp2YjNRdFp6SXVZM0pzTUVZR0ExVWRJQVEvTUQwd093WUVWUjBnQURBek1ERUcKQ0NzR0FRVUZCd0lCRmlWb2RIUndjem92TDJObGNuUnpMbWR2WkdGa1pIa3VZMjl0TDNKbGNHOXphWFJ2Y25rdgpNQTBHQ1NxR1NJYjNEUUVCQ3dVQUE0SUJBUUFJZm15VEVNZzR1SmFwa0V2L29WOVBCTzlzUHB5SUJzbFFqNlp6CjkxY3hHNzY4NUMvYitMclRXK0MwNStaNVlnNE1vdGRxWTNNeHRmV29TS1E3Q0MyaVhaRFh0SHdsVHhGV01NUzIKUkoxN0xKM2xYdWJ2REdHcXYrUXFHKzZFbnJpRGZjRkR6a1NuRTNBTmtSLzB5Qk90ZzJEWjJIS29jeVFldGF3aQpEc29YaVdKWVJCdXJpU1VCQUEvTnhCdGkyMUcwMHc5UktwdjB2SFA4ZHM0MnBNM1oyQ3pxcnB2MUtyS1EwVTExCkdJby9pa0dRSTMxYlMvNmtBMWliUnJMRFlHQ0QrSDFRUWM3Q29aRER1KzhDTDlJVlZPNUVGZGtLcnFlS00rMngKTFhZMkp0d0U2NS8zWVI4VjNJZHY3a2FXS0syaEpuMEtDYWN1QktPTnZQaThCREFCCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
          idpClientId: 'k8s',
          apiCertificate:
            'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJmakNDQVNTZ0F3SUJBZ0lVRUo3QjhteDl1ci9WQ2hxakdTNmdtMFRJTU5Bd0NnWUlLb1pJemowRUF3SXcKSFRFYk1Ca0dBMVVFQXhNU1ZVTlFJRU5zYVdWdWRDQlNiMjkwSUVOQk1CNFhEVEl4TVRJd016SXlOVFF3TUZvWApEVEkyTVRJd01qSXlOVFF3TUZvd0hURWJNQmtHQTFVRUF4TVNWVU5RSUVOc2FXVnVkQ0JTYjI5MElFTkJNRmt3CkV3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFb1U3ZERkMXZHY0x1MHlnUEtHakJrVFJRbkxYeDkwUGEKQW5UMEJtU1NzalRIUVpCdFBFZmpKZXVIeWthYlAzOHBlY2E0OHpmWDZCRWxnSkxKSzYySGtxTkNNRUF3RGdZRApWUjBQQVFIL0JBUURBZ0VHTUE4R0ExVWRFd0VCL3dRRk1BTUJBZjh3SFFZRFZSME9CQllFRk1WQTlGN0NDenpFClRJYmtDdTZqWmE3VU1jTGhNQW9HQ0NxR1NNNDlCQU1DQTBnQU1FVUNJUUNjL1JVOGZTaDJ2V2pnZFNiQ3A0SlEKUWF2QnJiK3dTUmRMUlcwaUprdXhUQUlnZjAzQ0JRV3FPYW1kaWhlUSt2N0J0U0s2TmdNY2RMZTV1Qm5RZmpxcgpEdlk9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJhVENDQVJDZ0F3SUJBZ0lVYkhSZll5WTlSZWQyWWtaR3piVk5qVDFoTFU4d0NnWUlLb1pJemowRUF3SXcKRXpFUk1BOEdBMVVFQXhNSWMzZGhjbTB0WTJFd0hoY05NakV4TWpBek1qSTFOREF3V2hjTk5ERXhNVEk0TWpJMQpOREF3V2pBVE1SRXdEd1lEVlFRREV3aHpkMkZ5YlMxallUQlpNQk1HQnlxR1NNNDlBZ0VHQ0NxR1NNNDlBd0VICkEwSUFCSHZTVi9zdVNRZ3NOUkx4UlF2SjFzUkFJeDR1R0dWQW9xRkloMUsyMENqNEZYZHBKaWpQMU1zcU1rM3oKM3llUGVSOUlUODBaaGdlT0NnTDhHWnNMTXFtalFqQkFNQTRHQTFVZER3RUIvd1FFQXdJQkJqQVBCZ05WSFJNQgpBZjhFQlRBREFRSC9NQjBHQTFVZERnUVdCQlJ1dTJqeDQxWnNsd0tuVXpsbFUwb2xuY0huYWpBS0JnZ3Foa2pPClBRUURBZ05IQURCRUFpQmRkSS9SVjVrZ2I2MUJndkNZeUVqRFEvdVRKVzgyV2FKUVV0MGNJdGd1SmdJZ0JrNTMKYWl3ckJ3NkkyVm4xdGtHNjlraXZ3WTFYYkJDNU1KRVYvVjdxbTM4PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',
          ucpUrl: 'https://172.19.120.100:6443',
          provider: 'openstack',
          region: 'openstack-eu',
        },
        {
          id: 'ff5764b2-1572-4306-a67d-057d0559ed90',
          name: 'test-cluster',
          namespace: 'lex-ns-2',
          created: '2021-12-07T12:46:15.000Z',
          deleteInProgress: false,
          isManagementCluster: false,
          ready: true,
          serverUrl: 'https://172.19.121.219:443',
          idpIssuerUrl:
            'https://container-cloud-auth.int.mirantis.com/auth/realms/iam',
          idpCertificate:
            'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUUwRENDQTdpZ0F3SUJBZ0lCQnpBTkJna3Foa2lHOXcwQkFRc0ZBRENCZ3pFTE1Ba0dBMVVFQmhNQ1ZWTXgKRURBT0JnTlZCQWdUQjBGeWFYcHZibUV4RXpBUkJnTlZCQWNUQ2xOamIzUjBjMlJoYkdVeEdqQVlCZ05WQkFvVApFVWR2UkdGa1pIa3VZMjl0TENCSmJtTXVNVEV3THdZRFZRUURFeWhIYnlCRVlXUmtlU0JTYjI5MElFTmxjblJwClptbGpZWFJsSUVGMWRHaHZjbWwwZVNBdElFY3lNQjRYRFRFeE1EVXdNekEzTURBd01Gb1hEVE14TURVd016QTMKTURBd01Gb3dnYlF4Q3pBSkJnTlZCQVlUQWxWVE1SQXdEZ1lEVlFRSUV3ZEJjbWw2YjI1aE1STXdFUVlEVlFRSApFd3BUWTI5MGRITmtZV3hsTVJvd0dBWURWUVFLRXhGSGIwUmhaR1I1TG1OdmJTd2dTVzVqTGpFdE1Dc0dBMVVFCkN4TWthSFIwY0RvdkwyTmxjblJ6TG1kdlpHRmtaSGt1WTI5dEwzSmxjRzl6YVhSdmNua3ZNVE13TVFZRFZRUUQKRXlwSGJ5QkVZV1JrZVNCVFpXTjFjbVVnUTJWeWRHbG1hV05oZEdVZ1FYVjBhRzl5YVhSNUlDMGdSekl3Z2dFaQpNQTBHQ1NxR1NJYjNEUUVCQVFVQUE0SUJEd0F3Z2dFS0FvSUJBUUM1NE1zUTFLOTJ2ZFNUWXVzd1pMaUJDR3pECkJObGlGNDR2L3o1bHo0L09ZdVk4VWh6YUZrVkxWYXQ0YTJPRFlwRE9EMmxzbWNnYUZJdE16RVV6Nm9qY25xT3YKSy82QVlaMTVWOFRQTHZRL01EeGRSL3lhRnJ6RE41WkJVWTRSUzFUNEtMN1FqTDd3TURnZTg3QW0rR1pIWTIzZQpjU1pIanpoSFU5RkdIYlRqM0FEcVJheTl2SEhacW04QTI5dk5NRHA1VDE5TVIvZ2Q3MXZDeEoxZ083R3lRNUhZCnBETk82clBXSjArdEpZcWx4dlRWMEthdWRBVmtWNGkxUkZYVUxTbzZQdmk0dmVreUNnS1VaTVFXT2xEeFNxN24KZVRPdkRDQUhmK2pmQkRuQ2FRSnNZMUw2ZDhFYnlIU0h5TG1UR0ZCVU5VdHBUcnc3MDBrdUg5ekIwbEw3QWdNQgpBQUdqZ2dFYU1JSUJGakFQQmdOVkhSTUJBZjhFQlRBREFRSC9NQTRHQTFVZER3RUIvd1FFQXdJQkJqQWRCZ05WCkhRNEVGZ1FVUU1LOUo0N01OSU13b2pQWCsyeXo4TFFzZ000d0h3WURWUjBqQkJnd0ZvQVVPcHFGQnhCbktMYnYKOXIwRlFXNGd3WlRhRDk0d05BWUlLd1lCQlFVSEFRRUVLREFtTUNRR0NDc0dBUVVGQnpBQmhoaG9kSFJ3T2k4dgpiMk56Y0M1bmIyUmhaR1I1TG1OdmJTOHdOUVlEVlIwZkJDNHdMREFxb0NpZ0pvWWthSFIwY0RvdkwyTnliQzVuCmIyUmhaR1I1TG1OdmJTOW5aSEp2YjNRdFp6SXVZM0pzTUVZR0ExVWRJQVEvTUQwd093WUVWUjBnQURBek1ERUcKQ0NzR0FRVUZCd0lCRmlWb2RIUndjem92TDJObGNuUnpMbWR2WkdGa1pIa3VZMjl0TDNKbGNHOXphWFJ2Y25rdgpNQTBHQ1NxR1NJYjNEUUVCQ3dVQUE0SUJBUUFJZm15VEVNZzR1SmFwa0V2L29WOVBCTzlzUHB5SUJzbFFqNlp6CjkxY3hHNzY4NUMvYitMclRXK0MwNStaNVlnNE1vdGRxWTNNeHRmV29TS1E3Q0MyaVhaRFh0SHdsVHhGV01NUzIKUkoxN0xKM2xYdWJ2REdHcXYrUXFHKzZFbnJpRGZjRkR6a1NuRTNBTmtSLzB5Qk90ZzJEWjJIS29jeVFldGF3aQpEc29YaVdKWVJCdXJpU1VCQUEvTnhCdGkyMUcwMHc5UktwdjB2SFA4ZHM0MnBNM1oyQ3pxcnB2MUtyS1EwVTExCkdJby9pa0dRSTMxYlMvNmtBMWliUnJMRFlHQ0QrSDFRUWM3Q29aRER1KzhDTDlJVlZPNUVGZGtLcnFlS00rMngKTFhZMkp0d0U2NS8zWVI4VjNJZHY3a2FXS0syaEpuMEtDYWN1QktPTnZQaThCREFCCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K',
          idpClientId: 'k8s',
          apiCertificate:
            'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJmekNDQVNTZ0F3SUJBZ0lVQ2ZMR0dqeVpQOE5VSDQyMy9mR0M5MW9kNU1rd0NnWUlLb1pJemowRUF3SXcKSFRFYk1Ca0dBMVVFQXhNU1ZVTlFJRU5zYVdWdWRDQlNiMjkwSUVOQk1CNFhEVEl4TVRJd056RXlOVEV3TUZvWApEVEkyTVRJd05qRXlOVEV3TUZvd0hURWJNQmtHQTFVRUF4TVNWVU5RSUVOc2FXVnVkQ0JTYjI5MElFTkJNRmt3CkV3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFZzYrc09jODZ3MUJ0VFBkci9LL1hBRGJIRm5zbktpcTIKT1ZCU0ZTR1l1ODg2eEw1aEJzK3hqb2gyTkxRUUVrdisyVEdCRHdBREFpMnJpMy90YVQrMnVxTkNNRUF3RGdZRApWUjBQQVFIL0JBUURBZ0VHTUE4R0ExVWRFd0VCL3dRRk1BTUJBZjh3SFFZRFZSME9CQllFRktQMXZ6V0VqWHBLCi9VNTVXek5NWUJ2ZWxXUHpNQW9HQ0NxR1NNNDlCQU1DQTBrQU1FWUNJUUN5Vm5PeVpFMnpDQnFUQWlVVm9tMisKcUdOTmc2RjNWbkFFWjJEL2QwVHJKd0loQUtQWEduYTNHTWNDdUsvTEVlWVpCYTVmc1p1QmdmanVtSi9FT2U0SApOREdnCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0KLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJhVENDQVJDZ0F3SUJBZ0lVUlJXYTl1V2FTUjlwK3QwcjYwRzVRVmhqT09nd0NnWUlLb1pJemowRUF3SXcKRXpFUk1BOEdBMVVFQXhNSWMzZGhjbTB0WTJFd0hoY05NakV4TWpBM01USTFNREF3V2hjTk5ERXhNakF5TVRJMQpNREF3V2pBVE1SRXdEd1lEVlFRREV3aHpkMkZ5YlMxallUQlpNQk1HQnlxR1NNNDlBZ0VHQ0NxR1NNNDlBd0VICkEwSUFCTHhDaUhQOGR3d0NIRFJoaGNhaWVDeFNLVnBaeXQxZVI0dnZFREdlWWRxSkM3UVlWeGlIQ0Q5Zk1kY0gKQ01oaktTQlBmMTRYZFZkWlk2M2pVRHEwalNXalFqQkFNQTRHQTFVZER3RUIvd1FFQXdJQkJqQVBCZ05WSFJNQgpBZjhFQlRBREFRSC9NQjBHQTFVZERnUVdCQlFKZFFWYm9Zc09rSHJZaFdkc0plZVRjb3UwNXpBS0JnZ3Foa2pPClBRUURBZ05IQURCRUFpQjA2MVRzRW1RV0tuTElpYjV3bVhkWVhrSnFrUG8zaDBQWXoycWZscUl1TmdJZ0xyNXgKOGR1QkdqWGlKVlpaUGEwMzE0czlaeU10OTlodHpReVZJNHdGQ0RzPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==',
          ucpUrl: 'https://172.19.121.219:6443',
          provider: 'openstack',
          region: 'openstack-eu',
        },
      ],
      clustersCount: 2,
      sshKeys: [],
      sshKeysCount: 0,
      credentials: {
        awscredential: [],
        allCredentialsCount: 1,
        byocredential: [],
        openstackcredential: [{}],
      },
    },
  ],
};

const checkboxesStateObj = (extCloud) => {
  return extCloud.namespaces.reduce((acc, namespace) => {
    acc[namespace.name] = false;
    return acc;
  }, {});
};

export const SynchronizeBlock = ({ extCloud }) => {
  // @type {object} sorted object of projects
  const [projectsList, setProjectsList] = useState(extCloud.namespaces);

  // @type {string} sort by name order
  const [nextSortType, setNextSortType] = useState('');

  // @type {object} checkboxes state
  const [сheckboxesState, setCheckboxesState] = useState({
    parent: false,
    children: checkboxesStateObj(extCloud),
  });

  if (!projectsList) {
    return null;
  }

  // sort by name initial array with projects
  const sortByName = () => {
    const sorted = [...projectsList].sort((a, b) => {
      if (nextSortType === '' || nextSortType === 'ASC') {
        setNextSortType('DESC');
        return a.name.localeCompare(b.name);
      } else if (nextSortType === 'DESC') {
        setNextSortType('ASC');
        return b.name.localeCompare(a.name);
      }
    });
    setProjectsList(sorted);
  };

  // set parent checkbox state based on changes of children checkboxes
  const setParentCheckboxState = (children) => {
    const childrenCheckboxes = Object.values(children);

    if (
      childrenCheckboxes.every((el) => el === false) ||
      childrenCheckboxes.every((el) => el === true)
    ) {
      return childrenCheckboxes[0];
    }
    if (childrenCheckboxes.some((el) => el === false)) {
      return true;
    }
    return сheckboxesState.parent;
  };

  const getNewChildren = (parentCheckedStatus) => {
    const newChildren = { ...сheckboxesState.children };

    Object.keys(сheckboxesState.children).forEach((name) => {
      newChildren[name] = parentCheckedStatus;
    });
    return newChildren;
  };

  const onChangeHandler = (name) => {
    if (!name) {
      setCheckboxesState({
        parent: !сheckboxesState.parent,
        children: getNewChildren(!сheckboxesState.parent),
      });
    } else {
      const newChildren = { ...сheckboxesState.children };
      newChildren[name] = !сheckboxesState.children[name];

      setCheckboxesState({
        children: newChildren,
        parent: setParentCheckboxState(newChildren),
      });
    }
  };

  const parentCheckboxValue = () => {
    const childrenCheckboxes = Object.values(сheckboxesState.children);

    if (
      сheckboxesState.parent &&
      childrenCheckboxes.some((el) => el === false) &&
      childrenCheckboxes.some((el) => el === true)
    ) {
      return checkValues.MIXED;
    }
    if (сheckboxesState.parent) {
      return checkValues.CHECKED;
    } else {
      return checkValues.UNCHECKED;
    }
  };

  const childrenCheckboxValue = (name) => {
    return сheckboxesState.children[name]
      ? checkValues.CHECKED
      : checkValues.UNCHECKED;
  };

  return (
    <Content>
      <Title>{synchronizeBlock.title()}</Title>
      <Projects>
        <ProjectsHead>
          <TriStateCheckbox
            label={synchronizeBlock.checkAllCheckboxLabel()}
            onChange={() => onChangeHandler()}
            value={parentCheckboxValue()}
          />
          <SortButton
            type="button"
            onClick={sortByName}
            isRotated={nextSortType === 'DESC' ? true : false}
          >
            <Component.Icon
              material="arrow_drop_up"
              style={{
                color: 'var(--textColorSecondary)',
                fontSize: 'calc(var(--font-size) * 1.8)',
                marginTop: layout.grid / 2,
              }}
            />
          </SortButton>
        </ProjectsHead>
        <ProjectsBody>
          <ProjectsList>
            {projectsList.map((namespace) => (
              <li key={namespace.name}>
                <Accordion
                  title={
                    <TriStateCheckbox
                      value={childrenCheckboxValue(namespace.name)}
                      label={namespace.name}
                      onChange={() => onChangeHandler(namespace.name)}
                    />
                  }
                >
                  <AccordionChildrenList>
                    <li>
                      <p>
                        {synchronizeBlock.checkboxesDropdownLabels.clusters()} (
                        {namespace.clustersCount})
                      </p>
                    </li>
                    <li>
                      <p>
                        {synchronizeBlock.checkboxesDropdownLabels.sshKeys()} (
                        {namespace.sshKeysCount})
                      </p>
                    </li>
                    <li>
                      <p>
                        {synchronizeBlock.checkboxesDropdownLabels.credentials()}{' '}
                        ({namespace.credentials.allCredentialsCount})
                      </p>
                    </li>
                  </AccordionChildrenList>
                </Accordion>
              </li>
            ))}
          </ProjectsList>
        </ProjectsBody>
      </Projects>
      <SynchronizeProjectsButtonWrapper>
        <Component.Button
          primary
          label={synchronizeBlock.synchronizeButtonLabel()}
        />
      </SynchronizeProjectsButtonWrapper>
    </Content>
  );
};

SynchronizeBlock.propTypes = {
  extCloud: PropTypes.object,
};

SynchronizeBlock.defaultProps = {
  extCloud: mockedExtCloud,
};
