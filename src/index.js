import React from 'react';
import ReactDOM from 'react-dom';
import compareVersions from 'compare-versions';
import Octokit from '@octokit/rest';
import {
  EuiButton,
  EuiCopy,
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiSelect,
  EuiSwitch,
  EuiProgress,
  EuiText,
} from '@elastic/eui';

import { extractContent, convertMarkdownToAsciidoc, cleanupIssueTitle, cleanupMarkdown } from './utils';
import { AsiidocRenderer } from './asciidoc';

import '@elastic/eui/dist/eui_theme_light.css';
import './styles.css';

// That's the id of the kibana repository in GitHub, it can be found via the searching repositories API.
const KIBANA_GITHUB_REPO_ID = 7833168;

const DEV_DOC_LABEL = 'release_note:plugin_api_changes';
const SEMVER_REGEX = /^v(\d+)\.(\d+)\.(\d+)$/;

const octokit = new Octokit({
  previews: ['symmetra-preview'],
});

class App extends React.Component {
  state = {
    issues: [],
    labels: null,
    isLoading: false,
    showOnlyClosed: true,
    renderPreview: false,
    selectedVersion: null,
  };

  async loadIssues(version) {
    const options = octokit.search.issuesAndPullRequests.endpoint.merge({
      q: `repo:elastic/kibana label:${DEV_DOC_LABEL} label:${version}`,
    });
    const items = await octokit.paginate(options);
    return items.filter(issue => {
      const versions = issue.labels
        .filter(label => label.name.match(SEMVER_REGEX))
        .map(label => label.name);
      // Check if there is any version label below the one we are looking for
      // which would mean this PR has already been released (and blogged about)
      // in an earlier dev documentation blog post.
      return !versions.some(
        verLabel => compareVersions(version, verLabel) === 1
      );
    });
  }

  selectVersion = async ev => {
    const version = ev.target.value;
    this.setState({ isLoading: true, selectedVersion: version });
    const rawIssues = await this.loadIssues(version);
    const issues = rawIssues.map(issue => {
      const text = extractContent(issue.body);
      return {
        pr: issue.number,
        state: issue.state,
        title: cleanupIssueTitle(issue.title),
        text: convertMarkdownToAsciidoc(cleanupMarkdown(text)),
      };
    });
    this.setState({ issues, isLoading: false });
  };

  renderIssue = (issue) => {
    return [
      `[[breaking_plugin_${this.state.selectedVersion}_${issue.pr}]]`,
      `.${issue.title}`,
      `[%collapsible]`,
      `====`,
      ``,
      `${issue.text}`,
      ``,
      `*via https://github.com/elastic/kibana/pull/${issue.pr}[#${issue.pr}]*`,
      ``,
      `====`
      ].join('\n');
  };

  renderBrokenIssues(brokenIssues) {
    return (
      <EuiFlexItem grow={false}>
        <EuiCallOut color="danger" title="Missing Dev Doc description">
          <p>
            The following PRs where labeled, but haven't had a Dev Doc section:
          </p>
          <ul>
            {brokenIssues.map(issue => (
              <li key={issue.pr}>
                <a href={`https://github.com/elastic/kibana/pull/${issue.pr}`}>
                  #{issue.pr}
                </a>
                <span> {issue.title}</span>
              </li>
            ))}
          </ul>
        </EuiCallOut>
      </EuiFlexItem>
    );
  }

  renderNoIssues() {
    return (
      <EuiEmptyPrompt
        iconType="faceHappy"
        title={<h2>No API changes</h2>}
        body={
          <React.Fragment>
            <p>
              No issue have yet been labeled as API breaking for the selected
              version.
            </p>
            <p>
              To add content to the breaking plugin changes, attach the{' '}
              <EuiCode>{DEV_DOC_LABEL}</EuiCode>
              label to a PR or issue and add the content, that should be added
              to the dev docs behind a <EuiCode># Plugin API changes</EuiCode> header in
              the issue description.
            </p>
          </React.Fragment>
        }
      />
    );
  }

  componentDidMount() {
    const endpoint = octokit.search.labels.endpoint.merge({
      repository_id: KIBANA_GITHUB_REPO_ID,
      order: 'desc',
      sort: 'created',
      q: 'v7 OR v8'
    });
    const MINOR_VERSION_REGEX = /^v\d+\.\d+\.0$/;
    octokit.paginate(endpoint).then(labels => {
      const minorLabels = labels
        .map(label => label.name)
        .filter(label => MINOR_VERSION_REGEX.test(label))
        .sort(compareVersions)
        .reverse()
        .map(label => ({ text: label, value: label }));

      this.setState({ labels: minorLabels });
    });
  }

  render() {
    const versionOptions = [
      { value: '', text: 'Select version', disabled: true },
      ...(this.state.labels || []),
    ];

    const closedIssues = this.state.issues.filter(issue => issue.state === 'closed');
    const issues = this.state.showOnlyClosed ? closedIssues : this.state.issues;
    const brokenIssues = issues.filter(issue => !issue.text);
    const asciidoc = issues
      .filter(issue => issue.text)
      .map(this.renderIssue)
      .join('\n\n');

    let switchLabel = 'Only show closed issues/PRs';
    if (this.state.issues.length) {
      switchLabel += ` (${closedIssues.length} of ${this.state.issues.length})`;
    }

    return (
      <EuiPage className="App">
        { this.state.isLoading && <EuiProgress position="fixed" color="accent" size="xs" /> }
        <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiSelect options={versionOptions} onChange={this.selectVersion} isLoading={this.state.labels === null}/>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label={switchLabel}
                    checked={this.state.showOnlyClosed}
                    onChange={(ev) => this.setState({ showOnlyClosed: ev.target.checked })}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label="Render preview"
                    checked={this.state.renderPreview}
                    onChange={(ev) => this.setState({ renderPreview: ev.target.checked })}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={true}/>
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={asciidoc}>
                    {copy => (
                      <EuiButton disabled={!asciidoc.length} onClick={copy} iconType="copy" size="s">Copy Asciidoc</EuiButton>
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          {brokenIssues.length > 0 && this.renderBrokenIssues(brokenIssues)}
          {this.state.issues.length === 0 && this.renderNoIssues()}
          {this.state.issues.length > 0 && (
            <EuiFlexItem>
                {this.state.renderPreview && <EuiText><AsiidocRenderer source={asciidoc} /></EuiText>}
                {!this.state.renderPreview &&
                  <EuiCodeBlock
                    className="App__asciidoc"
                    fontSize="m"
                    color="dark"
                    paddingSize="s"
                    isCopyable={true}
                  >
                    {asciidoc}
                  </EuiCodeBlock>
                }
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPage>
    );
  }
}

const rootElement = document.getElementById('root');
ReactDOM.render(<App />, rootElement);
