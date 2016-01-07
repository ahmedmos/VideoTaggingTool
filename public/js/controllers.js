﻿
var videoTaggingAppControllers = angular.module('videoTaggingAppControllers', []);

videoTaggingAppControllers

.factory('state', ['$http', '$rootScope', function ($http, $rootScope) {
    
    var jobStatus = {};
    
    $http({ method: 'GET', url: '/api/jobs/statuses' })
        .success(function (result) {
            console.log('got statuses', result);
            result.statuses.forEach(function (status) {
                jobStatus[status.Name] = status.Id;
            });
    })
    .error(function (err) {
        console.error(err);
    });
        
    $rootScope.jobSetup = {
        locationTypes: ['Area', 'Point'],
        locationShapes: ['Rectangle', 'Circle'],
        multiLocations: [{ id: '0', name: 'False' }, { id: '1', name: 'True' }],
        locationSizes: Array.apply(null, Array(100)).map(function (item, i) { return i + 1 })
    }

    return {
            getJobStatusByName: function () {
                return jobStatus;
            }
    };

}])

.controller('AppController', ['$scope', '$rootScope', '$route', '$http', '$location', '$routeParams', 'state', function ($scope, $rootScope, $route, $http, $location, $routeParams, state) {
    
        
        $http({ method: 'GET', url: '/profile' })
        .success(function (user) {
            console.log('got user profile', user);
            $rootScope.user = user;
        })
        .error(function (err){
            console.error(err);
        });

        $scope.logout = function (){
            $rootScope.user = user;
        }
        
        $scope.$route = $route;    

    }])
    

.controller('JobsController', ['$scope', '$route', '$http', '$location', '$routeParams', function ($scope, $route, $http, $location, $routeParams) {
        
        $scope.btnMeOrAll = 'me';
        $scope.btnStatus = 'all';

        $http({ method: 'GET', url: '/api/jobs/statuses' })
        .success(function (result) {
            $scope.jobStatuses = result.statuses;
        });
        
        var jobs;

        getJobsFromServer('/api/users/' + $scope.user.Id + '/jobs');
        
        function getJobsFromServer(url) {
            console.log('getting jobs', url);
            
            $http({ method: 'GET', url: url })
            .success(function (result) {
                jobs = result.jobs;
                _filter($scope.btnStatus);     
            });
        }
        
        function filterFetch(filter) {
            console.log('filter', filter);
            switch (filter) {
                case 'all':
                    getJobsFromServer('/api/jobs');
                    break;
                default:
                    getJobsFromServer('/api/users/' + $scope.user.Id + '/jobs');
            }
        }
        
        $scope.filterFetch = function (filter) {
            $scope.btnMeOrAll = filter;
            filterFetch(filter);
            console.log(this);
        }
        
        $scope.filter = function (status) {
            $scope.btnStatus = status;
            _filter(status);
        }
        
        function _filter(status) {
            $scope.jobs = jobs.filter(function (job) {
                return status==='all' || job.StatusName == status;
            });
        }
        
        $scope.edit = function (jobId) {
            $location.path('/jobs/' + jobId);
        }
        
        $scope.count = function (status) {
            return jobs && jobs.filter(function (job) {
                return !status || job.StatusId == status;
            }).length || 0;
        }

        $scope.getConfig = function (job) {
            return JSON.stringify(job.Config, true, 2);
        }

    }])
    
.controller('UpsertJobController', ['$scope', '$http', '$location', '$routeParams', 'state', function ($scope, $http, $location, $routeParams, state) {
        
        var defaultId = '[new]';
        $scope.jobId = defaultId;
        
        if ($routeParams.id != 0) {
            $http({ method: 'GET', url: '/api/jobs/' + $routeParams.id })
            .success(function (result) {
                console.log('jobData', result);
              //  $scope.jobData = result;
                $scope.jobId = result.job.Id;
                $scope.selectedVideo = result.video;
                $scope.selectedUser = result.user;
                $scope.selectedStatus = { Id: result.job.StatusId };
                console.log(' $scope.selectedStatus', $scope.selectedStatus);
                $scope.description = result.job.Description;
                
                $scope.config = result.job.Config;
                $scope.locationtype = result.job.Config.locationtype;
                $scope.locationshape = result.job.Config.locationshape;
                $scope.multilocations = result.job.Config.multilocations;
                $scope.locationsize = result.job.Config.locationsize;

                $scope.tags = result.job.Config.tags.join(', ');

            });
        }
      
        $http({ method: 'GET', url: '/api/jobs/statuses' })
        .success(function (result) {
            console.log('got statuses', result);
            $scope.jobStatuses = result.statuses;
        });

        $http({ method: 'GET', url: '/api/videos' })
            .success(function (result) {
            $scope.videos = result.videos;
            console.log('videos', result);
        });

        $http({ method: 'GET', url: '/api/users' })
            .success(function (result) {
            $scope.users = result.users;
            console.log('users', result);
        });

        $scope.submit = function () {
            
            clearMessages();
            
            var data = {
                videoId: $scope.selectedVideo.Id,
                userId: $scope.selectedUser.Id,
                description: $scope.description,
                statusId: $scope.selectedStatus.Id,
                configJson: {
                    locationtype: $scope.locationtype,
                    locationshape: $scope.locationshape,
                    multilocations: $scope.multilocations,
                    locationsize: $scope.locationsize,
                    tags: $scope.tags.split(',').map(function (tag) { return tag.trim(); })
                }
            };
            
            if ($scope.jobId != defaultId) {
                data.id = $scope.jobId;
            }
            
            console.log('submitting', data);

            $http({ method: 'POST', url: '/api/jobs', data: data })
            .success(function (result) {
                console.log('result', result);
                info('job ' + result.jobId + ($scope.jobId == defaultId ? ' created' : ' modified') + ' successfully');
                $scope.jobId = result.jobId;
            })
            .error(function (err) {
                console.error(err);
                error(err.error.message);
            });
        }
        
        function error(err) {
            $scope.error = err;
        }
        
        function info(msg) {
            $scope.info = msg;
        }
        
        function clearMessages() {
            $scope.error = '';
            $scope.info = '';
        }
    }])
    
    
.controller('UpsertUserController', ['$scope', '$http', '$location', '$routeParams', function ($scope, $http, $location, $routeParams) {
        
        var defaultId = '[new]';
        $scope.userId = defaultId;
        
        if ($routeParams.id != 0) {
            $http({ method: 'GET', url: '/api/users/' + $routeParams.id })
            .success(function (result) {
                console.log('userData', result);
                $scope.userId = result.Id;
                $scope.name = result.Name;
                $scope.email = result.Email;

                $scope.selectedRole = { Id: result.RoleId, name: result.RoleName };
            });
        }
        
        $http({ method: 'GET', url: '/api/roles' })
        .success(function (result) {
            console.log('got statuses', result);
            $scope.roles = result.roles;
        });
        
        
        $scope.submit = function () {
            
            clearMessages();
            
            var data = {
                name: $scope.name,
                email: $scope.email,
                roleId: $scope.selectedRole.Id
            };
            
            if ($scope.userId != defaultId) {
                data.id = $scope.userId;
            }
            
            console.log('submitting', data);
            
            $http({ method: 'POST', url: '/api/users', data: data })
            .success(function (result) {
                console.log('result', result);
                info('user ' + result.userId + ($scope.userId == defaultId ? ' created' : ' modified') + ' successfully');
                $scope.userId = result.userId;
            })
            .error(function (err) {
                console.error(err);
                error(err.error.message);
            });
        }
        
        function error(err) {
            $scope.error = err;
        }
        
        function info(msg) {
            $scope.info = msg;
        }
        
        function clearMessages() {
            $scope.error = '';
            $scope.info = '';
        }
    }])
    

.controller('VideosController', ['$scope', '$route', '$http', '$location', '$routeParams', function ($scope, $route, $http, $location, $routeParams) {
        var videos = [];
        var lastLabelSelected = null;

        getVideos();

        function getVideos(filter) {
            var url = '/api/videos';
            if (filter)
                url += "?filter=" + filter

            $http({ method: 'GET', url: url })
            .success(function (result) {
                videos = $scope.videos = result.videos;
            });
        }
       

        $http({ method: 'GET', url: '/api/labels' })
        .success(function (result) {
            labels = $scope.labels = result.labels;
        });

        
        $scope.edit = function (id) {
            $location.path('/videos/' + id);
        }

        $scope.limitOnlyOne = function (label) {
            if (lastLabelSelected == null)
                lastLabelSelected = label;
            else
            {
                if (label.selected)
                {
                    lastLabelSelected.selected = false;
                    lastLabelSelected = label;
                }
                else
                {
                    lastLabelSelected = null;
                }
            }
        }

        $scope.filterByLabel = function () {
            var selectedFilters = [];

            angular.forEach(
                $scope.labels,
                function(label) {
                    // Yes - It's a double exclamation mark (Converts to bool)
                    if (!!label.selected) selectedFilters.push(label);
                });

            // This should get the whole array. For now - It gets only the first one
            if (selectedFilters.length > 0)
                getVideos(selectedFilters[0].Id);
            else
                getVideos();
        }
    }])

    
.controller('TagJobController', ['$scope', '$route', '$http', '$location', '$routeParams', 'state', function ($scope, $route, $http, $location, $routeParams, state) {
        
        var videoCtrl = document.getElementById('video-tagging');

        var jobId = $routeParams.id;

        $http({ method: 'GET', url: '/api/jobs/' + jobId })
        .success(function (jobData) {
            $scope.jobData = jobData;
            console.log('jobData', jobData);

                videoCtrl.videoduration = jobData.video.DurationSeconds;
                videoCtrl.videowidth = jobData.video.Width;
                videoCtrl.videoheight = jobData.video.Height;
                videoCtrl.framerate = jobData.video.FramesPerSecond;

                videoCtrl.locationshape = jobData.job.Config.locationshape;
                videoCtrl.locationtype = jobData.job.Config.locationtype;
                videoCtrl.multilocations = jobData.job.Config.multilocations;
                videoCtrl.locationsize = jobData.job.Config.locationsize;

                videoCtrl.inputtagsarray = jobData.job.Config.tags;

                $http({ method: 'GET', url: '/api/jobs/' + $routeParams.id + '/frames' })
                    .success(function (result) {
                        videoCtrl.inputFrames = result.frames;
                        videoCtrl.src = '';
                        console.log('video url', jobData.video.Url);
                        videoCtrl.src = jobData.video.Url;
                    });
        });
        
    
        $scope.updateJobStatus = function (status) {
            var statusId = state.getJobStatusByName()[status];
            
            var data = { statusId: statusId };
            
            $http({ method: 'POST', url: "/api/jobs/" + jobId + "/status", data: data })
            .success(function () {
                console.log('success');
                info('job updated');
            })
            .error(function (err) {
                console.error(err);
                error('error updating job: ' + err.message);
            });
        }

        function tagHandler(e) {
            var inputObject = e.detail.location;

            var msg = {};
            msg.tags = inputObject.locations;
            
            $http({ method: 'POST', url: '/api/jobs/' + jobId + '/frames/' + inputObject.frameIndex, data: msg })
            .success(function (result) {
                console.log('success');
            })
            .error(function (err) {
                console.error('error', err);
            });
           
        }

        window.addEventListener('onlocationchanged', tagHandler);

        $scope.$on('$destroy', function() {
            window.removeEventListener('onlocationchanged', tagHandler);
        })

        function error(err) {
            $scope.error = err;
        }
        
        function info(msg) {
            $scope.info = msg;
        }
        
        function clearMessages() {
            $scope.error = '';
            $scope.info = '';
        }

    }])

.controller('UpsertVideoController', ['$scope', '$http', '$location', '$routeParams', function ($scope, $http, $location, $routeParams) {
        
        var labels = [];

        var defaultId = '[new]';
        $scope.videoId = defaultId;
        $scope.config = '{}';
        $scope.progress = null;

        if ($routeParams.id != 0) {
            $http({ method: 'GET', url: '/api/videos/' + $routeParams.id })
            .success(function (video) {
                console.log('video', video);
               
                $scope.videoId = video.Id;
                $scope.name = video.Name;
                $scope.url = video.Url;
                $scope.height = video.Height;
                $scope.width = video.Width;
                $scope.duration = video.DurationSeconds.toFixed(2);
                $scope.framesPerSecond = video.FramesPerSecond.toFixed(2);
            });


            console.log('getting video labels');
            $http({ method: 'GET', url: '/api/videoLabels/' + $routeParams.id })
            .success(function (result) {
                // var labelsString = '';
                console.log('video labels', result.labels);
                var labelsString = result.labels && result.labels.length && result.labels.map(function(item) { return item['Name']; });;

                $scope.videoLabels = labelsString;
            });
        }


        $http({ method: 'GET', url: '/api/labels' })
            .success(function (result) {

            angular.forEach(
                result.labels,
                function(label) {
                    label.value = label.Name;
                    labels.push(label);
                });

            $('#tokenfield').tokenfield({
              autocomplete: {
                //source: ['red','blue','green','yellow','violet','brown','purple','black','white'],
                source: labels,
                delay: 100
              },
              showAutocompleteOnFocus: true,
            });
        });

        $scope.submit = function () {
            
            clearMessages();

            // First add all the labels to the database (in case there are new labels)
            var videoLabels = $('#tokenfield').tokenfield('getTokens');
            var missingLabels = [];
            angular.forEach(
                videoLabels,
                function(videoLabel) {
                    var found = false;

                    // Do we know this label?
                    for (i = 0; i < labels.length; i++) {
                        if (labels[i].Name === videoLabel.Name) {
                            found = true;
                            break;
                        }
                    }

                    if (!found)
                        missingLabels.push(videoLabel);
                });

            // Any missing labels?
            if (missingLabels.length > 0)
            {
                // Add all the labels that are missing
                var labelData = {
                    labels: missingLabels
                };  
                $http({ method: 'POST', url: '/api/labels', data: labelData }).success(
                    function (result) { 
                        console.log('Label add result', result);

                        // Merge the returned set with the missing video labels
                        angular.forEach(
                            videoLabels,
                            function(videoLabel) {
                                if (!videoLabel.Id)
                                {
                                    for (var j=0; j < result.labels.length; j++)
                                    {
                                        if (videoLabel.value == result.labels[j].Name)
                                            videoLabel.Id = result.labels[j].Id;
                                    }
                                }
                            });

                        // Labels added. Now add all labels to the video
                        submitVideoInfo(videoLabels);
                    });                    
            }

            // No missing labels. Attached the labels to the video
            submitVideoInfo(videoLabels);
        }

        function submitVideoInfo(videoLabels)
        {           
            // First add the video to the database            
            var data = {
                name: $scope.name,
                height: $scope.height,
                width: $scope.width,
                durationSeconds: $scope.duration,
                framesPerSecond: $scope.framesPerSecond,
                labels: videoLabels
            };
            
            if ($scope.videoId != defaultId) {
                data.id = $scope.videoId;
            }
            
            console.log('submitting', data);
            
            $http({ method: 'POST', url: '/api/videos', data: data })
            .success(function (result) {
                console.log('result', result);
                info('video ' + result.videoId + ($scope.videoId == defaultId ? ' created' : ' modified') + ' successfully');
                $scope.videoId = result.videoId;
            })
            .error(function (err) {
                console.error(err);
                error(err.error.message);
            });
        }
               
        $scope.submitVideo = function() {
            clearMessages();
            
            var form = document.getElementById('uploadVideoForm');

            var formData = new FormData(form);
           
            $.ajax({
                url: '/api/videos/' + $scope.videoId,
                type: 'POST',
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                success: function (result) {
                    $scope.$apply(function () { 
                        console.log('video uploaded successfully');
                        info('video uploaded successfully');
                    });
                },
                error: function (err) {
                    $scope.$apply(function () { 
                        console.error('error uploading video', err);
                        error('error uploading video ' + err.message);
                    });
                },
                xhr: function () {
                    var xhr = new window.XMLHttpRequest();
                    //Upload progress
                    xhr.upload.addEventListener('progress', updateProgress, true);
                    //Download progress
                    xhr.addEventListener("progress", updateProgress, false);
                    return xhr;
                }
            });

        }

        function updateProgress(e) {
            $scope.$apply(function () {
                console.log('got progress', e);
                if (e.lengthComputable) {
                    var pct = Math.ceil((e.loaded / e.total) * 100);
                    console.log('progress', pct);
                    $scope.progress = pct;
                    if(pct == 100) {
                        setTimeout(function(){
                            $scope.$apply(function () {
                                $scope.progress = null;
                            });
                        }, 3000);
                    }
                } else {
                    console.warn('Content Length not reported!');
                }
            });
        }

        function error(err) {
            $scope.error = err;
        }
        
        function info(msg) {
            $scope.info = msg;
        }
        
        function clearMessages() {
            $scope.error = '';
            $scope.info = '';
        }
    }])
    
    .controller('UsersController', ['$scope', '$route', '$http', '$location', '$routeParams', function ($scope, $route, $http, $location, $routeParams) {
    var users = [];

    $http({ method: 'GET', url: '/api/users' })
        .success(function (result) {
            users = $scope.users = result.users;
        });

    $scope.edit = function (id) {
        $location.path('/users/' + id);
    }

}]);