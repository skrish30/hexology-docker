# Hexology Conference Companion

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites (Linux Ubuntu 16.04 LTS)

* Ensure you have a [IBM Cloud account](https://www.ibm.com/cloud/)
* Install npm and node js
```
sudo npm install nodejs
```
#### If running locally

1. Install the dependencies

    ```
    npm install
    ```

1. Run the application

    ```
    npm start
    ```

1. View the application in a browser at `localhost:3000`

#### If deploying to IBM Cloud as a Cloud Foundry Application

1. Login to IBM Cloud with the [IBM Cloud CLI](https://cloud.ibm.com/docs/cli/index.html#overview)

    ```
    ibmcloud login
    ```

1. Target a Cloud Foundry organization and space.

    ```
    ibmcloud target --cf
    ```

1. Edit the *manifest.yml* file. Change the **name** field to something unique.  
  For example, `- name: my-app-name`.
1. Deploy the application

    ```
    ibmcloud app push
    ```

1. View the application online at the app URL.  
For example: https://my-app-name.mybluemix.net

## Building the system

Explain what has been done to develop the system

### Back-end (Watson) Services

#### Watson Assistant

Watson Assistant is an artificial chatbot builder that allows you to construct a conversation interface into any application, device, or channel.
#### Watson Speech to Text

#### Watson Discovery

Watson Discovery is a query tool that can add cognitive search and content analysis engines to identify patterns, trends, and actionable insights. It is able to integrate structured and unstructured data with certain topics or types of entities, filter documents from a large data set or passages from a single document with specified contents and provide tone analysis or keyword extractions.
### Front-end server (webpage)

#### Webpage Design


## Deployment

### Running the system

### Debugging
Add additional notes about how to deploy this on a live system

## Built With

* Watson Assistant - The web chatbot used. Version 2.0
* Watson Speech to Text - Dependency Management
* Watson Discovery - Used to query and filter transcript. Version 1.0

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.


## Authors

* **Billie Thompson** - *Initial work* - [PurpleBooth](https://github.com/PurpleBooth)

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Hat tip to anyone whose code was used
* Inspiration
* etc
